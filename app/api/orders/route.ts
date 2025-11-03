import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET all orders for a user or market
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const marketId = searchParams.get('marketId');

    if (!userId && !marketId) {
      return NextResponse.json(
        { error: 'userId or marketId required' },
        { status: 400 }
      );
    }

    const where: any = {};
    if (userId) where.userId = userId;
    if (marketId) where.marketId = parseInt(marketId);

    const orders = await prisma.order.findMany({
      where,
      include: {
        market: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// POST create new order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, marketId, side, type, price, quantity } = body;

    // Validation
    if (!userId || !marketId || !side || !type || !price || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (side !== 'yes' && side !== 'no') {
      return NextResponse.json(
        { error: 'Invalid side. Must be yes or no' },
        { status: 400 }
      );
    }

    if (type !== 'limit' && type !== 'market') {
      return NextResponse.json(
        { error: 'Invalid type. Must be limit or market' },
        { status: 400 }
      );
    }

    // Check user has sufficient balance
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const cost = price * quantity;
    const availableBalance = Number(user.usdcBalance) - Number(user.lockedBalance);

    if (availableBalance < cost) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        userId,
        marketId: parseInt(marketId),
        side,
        type,
        price,
        quantity,
        remaining: quantity,
        status: 'open'
      }
    });

    // Lock the funds
    await prisma.user.update({
      where: { id: userId },
      data: {
        lockedBalance: {
          increment: cost
        }
      }
    });

    return NextResponse.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

// DELETE cancel order
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId required' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.status !== 'open') {
      return NextResponse.json(
        { error: 'Cannot cancel non-open order' },
        { status: 400 }
      );
    }

    // Cancel order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'cancelled'
      }
    });

    // Unlock funds
    const lockedAmount = Number(order.price) * Number(order.remaining);
    await prisma.user.update({
      where: { id: order.userId },
      data: {
        lockedBalance: {
          decrement: lockedAmount
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Order cancelled'
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    );
  }
}