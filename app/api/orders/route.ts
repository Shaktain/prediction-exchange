import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const { userId, marketId, side, direction, type, price, quantity } = body;

    // Validation
    if (!userId || !marketId || !side || !direction || !type || !price || !quantity) {
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

    if (direction !== 'buy' && direction !== 'sell') {
      return NextResponse.json(
        { error: 'Invalid direction. Must be buy or sell' },
        { status: 400 }
      );
    }

    if (type !== 'limit' && type !== 'market') {
      return NextResponse.json(
        { error: 'Invalid type. Must be limit or market' },
        { status: 400 }
      );
    }

    // Check user has sufficient balance or shares
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (direction === 'buy') {
      // Buying shares - need USDC balance
      const cost = price * quantity;
      const availableBalance = Number(user.usdcBalance) - Number(user.lockedBalance);

      if (availableBalance < cost) {
        return NextResponse.json(
          { error: 'Insufficient balance' },
          { status: 400 }
        );
      }
    } else {
      // Selling shares - lock USDC as collateral for short position
      const cost = (1 - price) * quantity; // Cost is opposite side price
      const availableBalance = Number(user.usdcBalance) - Number(user.lockedBalance);

      if (availableBalance < cost) {
        return NextResponse.json(
          { error: 'Insufficient balance for short position' },
          { status: 400 }
        );
      }
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        userId,
        marketId: parseInt(marketId),
        side,
        direction,
        type,
        price,
        quantity,
        remaining: quantity,
        status: 'open'
      }
    });

    if (direction === 'buy') {
      // Lock the funds for buy orders
      const cost = price * quantity;
      await prisma.user.update({
        where: { id: userId },
        data: {
          lockedBalance: {
            increment: cost
          }
        }
      });
    } else {
      // Lock the shares for sell orders
      const field = side === 'yes' ? 'yesShares' : 'noShares';
      await prisma.position.update({
        where: {
          userId_marketId: { userId, marketId: parseInt(marketId) }
        },
        data: {
          [field]: {
            decrement: quantity
          }
        }
      });
    }

    // Try to match the order
    await matchOrder(prisma, order, parseInt(marketId));

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

    if (order.status !== 'open' && order.status !== 'partial') {
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

    if (order.direction === 'buy') {
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
    } else {
      // Return shares to position
      const field = order.side === 'yes' ? 'yesShares' : 'noShares';
      await prisma.position.update({
        where: {
          userId_marketId: { 
            userId: order.userId, 
            marketId: order.marketId 
          }
        },
        data: {
          [field]: {
            increment: Number(order.remaining)
          }
        }
      });
    }

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

// ============================================================================
// MATCHING ENGINE FUNCTIONS
// ============================================================================

async function matchOrder(prisma: any, newOrder: any, marketId: number) {
  // Buy orders match with sell orders on the SAME side
  // Sell orders match with buy orders on the SAME side
  
  const oppositeDirection = newOrder.direction === 'buy' ? 'sell' : 'buy';

  // Get opposing orders (same side, opposite direction)
  const opposingOrders = await prisma.order.findMany({
    where: {
      marketId,
      side: newOrder.side, // SAME side (yes matches with yes, no with no)
      direction: oppositeDirection, // OPPOSITE direction (buy matches with sell)
      status: { in: ['open', 'partial'] },
      remaining: { gt: 0 }
    },
    orderBy: newOrder.direction === 'buy' 
      ? [
          { price: 'asc' },    // Buy orders want lowest sell prices first
          { createdAt: 'asc' }
        ]
      : [
          { price: 'desc' },   // Sell orders want highest buy prices first
          { createdAt: 'asc' }
        ]
  });

  let remainingQty = Number(newOrder.remaining);

  for (const opposingOrder of opposingOrders) {
    if (remainingQty <= 0) break;

    const newPrice = Number(newOrder.price);
    const oppPrice = Number(opposingOrder.price);

    // Check if prices cross (can match)
    let pricesCross = false;
    if (newOrder.direction === 'buy') {
      // Buy order: willing to pay newPrice, seller asking oppPrice
      pricesCross = newPrice >= oppPrice;
    } else {
      // Sell order: willing to accept newPrice, buyer offering oppPrice
      pricesCross = oppPrice >= newPrice;
    }

    if (!pricesCross) continue;

    // Calculate match quantity
    const matchQty = Math.min(remainingQty, Number(opposingOrder.remaining));

    // Execute at maker's price (opposing order price)
    const executionPrice = oppPrice;

    // Determine buyer and seller
    const buyOrder = newOrder.direction === 'buy' ? newOrder : opposingOrder;
    const sellOrder = newOrder.direction === 'sell' ? newOrder : opposingOrder;

    // Create trade record
    await prisma.trade.create({
      data: {
        marketId,
        buyOrderId: buyOrder.id,
        sellOrderId: sellOrder.id,
        buyerUserId: buyOrder.userId,
        sellerUserId: sellOrder.userId,
        side: newOrder.side,
        price: executionPrice,
        quantity: matchQty
      }
    });

    // Update new order
    remainingQty -= matchQty;
    await prisma.order.update({
      where: { id: newOrder.id },
      data: {
        filled: { increment: matchQty },
        remaining: { decrement: matchQty },
        status: remainingQty === 0 ? 'filled' : 'partial'
      }
    });

    // Update opposing order
    const oppRemaining = Number(opposingOrder.remaining) - matchQty;
    await prisma.order.update({
      where: { id: opposingOrder.id },
      data: {
        filled: { increment: matchQty },
        remaining: { decrement: matchQty },
        status: oppRemaining === 0 ? 'filled' : 'partial'
      }
    });

    // Handle settlements
    await settleTradeForBuyer(
      prisma,
      buyOrder.userId,
      marketId,
      newOrder.side,
      matchQty,
      executionPrice
    );

    await settleTradeForSeller(
      prisma,
      sellOrder.userId,
      marketId,
      newOrder.side,
      matchQty,
      executionPrice
    );
  }
}

async function settleTradeForBuyer(
  prisma: any,
  userId: string,
  marketId: number,
  side: string,
  quantity: number,
  price: number
) {
  const cost = quantity * price;

  // Deduct locked balance
  await prisma.user.update({
    where: { id: userId },
    data: {
      lockedBalance: { decrement: cost }
    }
  });

  // Add shares to position
  const position = await prisma.position.findUnique({
    where: {
      userId_marketId: { userId, marketId }
    }
  });

  const field = side === 'yes' ? 'yesShares' : 'noShares';
  const costField = side === 'yes' ? 'avgYesCost' : 'avgNoCost';

  if (position) {
    const currentShares = Number(position[field]);
    const currentCost = Number(position[costField]);
    const newShares = currentShares + quantity;
    const newAvgCost = newShares > 0 
      ? ((currentShares * currentCost) + (quantity * price)) / newShares 
      : 0;

    await prisma.position.update({
      where: { id: position.id },
      data: {
        [field]: newShares,
        [costField]: newAvgCost
      }
    });
  } else {
    await prisma.position.create({
      data: {
        userId,
        marketId,
        yesShares: side === 'yes' ? quantity : 0,
        noShares: side === 'no' ? quantity : 0,
        avgYesCost: side === 'yes' ? price : 0,
        avgNoCost: side === 'no' ? price : 0
      }
    });
  }
}

async function settleTradeForSeller(
  prisma: any,
  userId: string,
  marketId: number,
  side: string,
  quantity: number,
  price: number
) {
  const proceeds = quantity * price;

  // Add proceeds to balance
  await prisma.user.update({
    where: { id: userId },
    data: {
      usdcBalance: { increment: proceeds }
    }
  });

  // Shares were already deducted when sell order was placed
  // No need to touch position here
}