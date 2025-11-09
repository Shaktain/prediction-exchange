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
    const mode = searchParams.get('mode') || 'demo'; // Get mode from query

    if (!userId) {
      return NextResponse.json(
        { error: 'userId required' },
        { status: 400 }
      );
    }

    const positions = await prisma.position.findMany({
      where: { 
        userId,
        mode // ← Filter by mode
      },
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
      const currentYesPrice = Number(market.yesPrice);
      const currentNoPrice = Number(market.noPrice);
      
      let yesUnrealizedPnL = 0;
      let noUnrealizedPnL = 0;
      
      // Calculate YES position P&L
      if (yesShares > 0) {
        // LONG YES: bought at avgYesCost, currently worth currentYesPrice
        const costBasis = yesShares * avgYesCost;
        const currentValue = yesShares * currentYesPrice;
        yesUnrealizedPnL = currentValue - costBasis;
      } else if (yesShares < 0) {
        // SHORT YES: sold at avgYesCost, would need to buy back at currentYesPrice
        const soldFor = Math.abs(yesShares) * avgYesCost;
        const buyBackCost = Math.abs(yesShares) * currentYesPrice;
        yesUnrealizedPnL = soldFor - buyBackCost;
      }
      
      // Calculate NO position P&L
      if (noShares > 0) {
        // LONG NO: bought at avgNoCost, currently worth currentNoPrice
        const costBasis = noShares * avgNoCost;
        const currentValue = noShares * currentNoPrice;
        noUnrealizedPnL = currentValue - costBasis;
      } else if (noShares < 0) {
        // SHORT NO: sold at avgNoCost, would need to buy back at currentNoPrice
        const soldFor = Math.abs(noShares) * avgNoCost;
        const buyBackCost = Math.abs(noShares) * currentNoPrice;
        noUnrealizedPnL = soldFor - buyBackCost;
      }
      
      const unrealizedPnL = yesUnrealizedPnL + noUnrealizedPnL;
      const realizedPnL = Number(pos.realizedPnL);
      const totalPnL = unrealizedPnL + realizedPnL;

      return {
        id: pos.id,
        userId: pos.userId,
        marketId: pos.marketId,
        yesShares,
        noShares,
        avgYesCost,
        avgNoCost,
        realizedPnL,
        unrealizedPnL,
        totalPnL,
        market: {
          id: market.id,
          title: market.title,
          category: market.category,
          yesPrice: currentYesPrice,
          noPrice: currentNoPrice,
          resolved: market.resolved,
          outcome: market.outcome
        }
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