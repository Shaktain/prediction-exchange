import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const marketId = searchParams.get('marketId');
    const mode = searchParams.get('mode') || 'demo'; // ← ADD THIS

    if (!marketId) {
      return NextResponse.json(
        { error: 'marketId required' },
        { status: 400 }
      );
    }

    console.log(`📖 Fetching order book for market ${marketId}, mode: ${mode}`);

    // Get YES buy orders (bids) - FILTERED BY MODE
    const yesBids = await prisma.order.findMany({
      where: {
        marketId: parseInt(marketId),
        side: 'yes',
        direction: 'buy',
        mode: mode, // ← ADD THIS
        status: { in: ['open', 'partial'] },
        remaining: { gt: 0 }
      },
      orderBy: [
        { price: 'desc' },
        { createdAt: 'asc' }
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

    // Get YES sell orders (asks) - FILTERED BY MODE
    const yesAsks = await prisma.order.findMany({
      where: {
        marketId: parseInt(marketId),
        side: 'yes',
        direction: 'sell',
        mode: mode, // ← ADD THIS
        status: { in: ['open', 'partial'] },
        remaining: { gt: 0 }
      },
      orderBy: [
        { price: 'asc' },
        { createdAt: 'asc' }
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

    // Get NO buy orders (bids) - FILTERED BY MODE
    const noBids = await prisma.order.findMany({
      where: {
        marketId: parseInt(marketId),
        side: 'no',
        direction: 'buy',
        mode: mode, // ← ADD THIS
        status: { in: ['open', 'partial'] },
        remaining: { gt: 0 }
      },
      orderBy: [
        { price: 'desc' },
        { createdAt: 'asc' }
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

    // Get NO sell orders (asks) - FILTERED BY MODE
    const noAsks = await prisma.order.findMany({
      where: {
        marketId: parseInt(marketId),
        side: 'no',
        direction: 'sell',
        mode: mode, // ← ADD THIS
        status: { in: ['open', 'partial'] },
        remaining: { gt: 0 }
      },
      orderBy: [
        { price: 'asc' },
        { createdAt: 'asc' }
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
    const orderBook = {
      yesBids: aggregateByPrice(yesBids),
      yesAsks: aggregateByPrice(yesAsks),
      noBids: aggregateByPrice(noBids),
      noAsks: aggregateByPrice(noAsks)
    };

    // Get recent trades for price chart - FILTERED BY MODE
    const recentTrades = await prisma.trade.findMany({
      where: { 
        marketId: parseInt(marketId),
        mode: mode // ← ADD THIS
      },
      orderBy: { executedAt: 'desc' },
      take: 100,
      select: {
        price: true,
        quantity: true,
        side: true,
        executedAt: true
      }
    });

    console.log(`✅ Order book fetched: ${yesBids.length + yesAsks.length + noBids.length + noAsks.length} orders for mode: ${mode}`);

    return NextResponse.json({
      orderBook,
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