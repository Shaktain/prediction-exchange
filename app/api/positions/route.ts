import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Position {
  id: string;
  userId: string;
  marketId: number;
  yesShares: any;
  noShares: any;
  avgYesCost: any;
  avgNoCost: any;
  realizedPnL: any;
  market: {
    id: number;
    yesPrice: any;
    noPrice: any;
    resolved: boolean;
    outcome: boolean | null;
    [key: string]: any;
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId required' },
        { status: 400 }
      );
    }

    const positions = await prisma.position.findMany({
      where: { userId },
      include: {
        market: true
      }
    });

    // Calculate unrealized P&L for each position
    const positionsWithPnL = positions.map((pos: Position) => {
      const market = pos.market;
      const yesShares = Number(pos.yesShares);
      const noShares = Number(pos.noShares);
      const avgYesCost = Number(pos.avgYesCost);
      const avgNoCost = Number(pos.avgNoCost);
      
      // Current value at market prices
      const yesValue = yesShares * Number(market.yesPrice);
      const noValue = noShares * Number(market.noPrice);
      
      // Cost basis
      const yesCost = yesShares * avgYesCost;
      const noCost = noShares * avgNoCost;
      
      // Unrealized P&L
      const unrealizedPnL = (yesValue + noValue) - (yesCost + noCost);

      return {
        ...pos,
        unrealizedPnL
      };
    });

    return NextResponse.json({ positions: positionsWithPnL });
  } catch (error) {
    console.error('Error fetching positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500 }
    );
  }
}