// app/api/admin/unresolved-markets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Fetch only unresolved markets
    const markets = await prisma.market.findMany({
      where: {
        resolved: false, // Only unresolved markets
      },
      include: {
        options: {
          select: {
            id: true,
            text: true,
          },
        },
        _count: {
          select: {
            trades: true,
          },
        },
      },
      orderBy: {
        endDate: 'asc',
      },
    });

    // Calculate volume for each market
    const marketsWithStats = await Promise.all(
      markets.map(async (market) => {
        const trades = await prisma.trade.findMany({
          where: { marketId: market.id },
          select: { price: true, quantity: true },
        });

        const volume = trades.reduce((sum, trade) => {
          return sum + Number(trade.price) * Number(trade.quantity);
        }, 0);

        return {
          id: market.id,
          question: market.question,
          category: market.category,
          endDate: market.endDate,
          volume,
          resolved: market.resolved,
          resolvedOutcome: market.resolvedOutcome,
          options: market.options.length > 0 ? market.options : undefined,
        };
      })
    );

    return NextResponse.json({
      success: true,
      markets: marketsWithStats,
    });
  } catch (error: any) {
    console.error('Failed to fetch unresolved markets:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}