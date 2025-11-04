import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const marketId = searchParams.get('marketId');

    if (!marketId) {
      return NextResponse.json(
        { error: 'marketId required' },
        { status: 400 }
      );
    }

    // Get all open orders for this market, sorted by price-time priority
    const yesOrders = await prisma.order.findMany({
      where: {
        marketId: parseInt(marketId),
        side: 'yes',
        status: { in: ['open', 'partial'] },
        remaining: { gt: 0 }
      },
      orderBy: [
        { price: 'desc' }, // Best prices first (highest for YES)
        { createdAt: 'asc' } // Time priority
      ],
      select: {
        id: true,
        price: true,
        remaining: true,
        createdAt: true,
        user: {
          select: {
            walletAddress: true
          }
        }
      }
    });

    const noOrders = await prisma.order.findMany({
      where: {
        marketId: parseInt(marketId),
        side: 'no',
        status: { in: ['open', 'partial'] },
        remaining: { gt: 0 }
      },
      orderBy: [
        { price: 'desc' }, // Best prices first (highest for NO)
        { createdAt: 'asc' } // Time priority
      ],
      select: {
        id: true,
        price: true,
        remaining: true,
        createdAt: true,
        user: {
          select: {
            walletAddress: true
          }
        }
      }
    });

    // Aggregate orders by price level
    const yesBids = aggregateByPrice(yesOrders);
    const noAsks = aggregateByPrice(noOrders);

    // Get recent trades for price chart
    const recentTrades = await prisma.trade.findMany({
      where: { marketId: parseInt(marketId) },
      orderBy: { executedAt: 'desc' },
      take: 100,
      select: {
        price: true,
        quantity: true,
        side: true,
        executedAt: true
      }
    });

    return NextResponse.json({
      orderBook: {
        yes: yesBids,
        no: noAsks
      },
      recentTrades,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching order book:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order book' },
      { status: 500 }
    );
  }
}

function aggregateByPrice(orders: any[]) {
  const priceMap = new Map<string, { 
    price: number; 
    totalQuantity: number; 
    orderCount: number;
    orders: any[];
  }>();

  for (const order of orders) {
    const priceKey = Number(order.price).toFixed(6);
    
    if (!priceMap.has(priceKey)) {
      priceMap.set(priceKey, {
        price: Number(order.price),
        totalQuantity: 0,
        orderCount: 0,
        orders: []
      });
    }

    const level = priceMap.get(priceKey)!;
    level.totalQuantity += Number(order.remaining);
    level.orderCount += 1;
    level.orders.push({
      id: order.id,
      quantity: Number(order.remaining),
      timestamp: order.createdAt,
      user: order.user.walletAddress.slice(0, 6) + '...' + order.user.walletAddress.slice(-4)
    });
  }

  return Array.from(priceMap.values()).sort((a, b) => b.price - a.price);
}