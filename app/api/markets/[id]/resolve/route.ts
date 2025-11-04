import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { outcome } = await request.json();
    const marketId = parseInt(id);

    if (typeof outcome !== 'boolean') {
      return NextResponse.json(
        { error: 'Outcome must be true (YES) or false (NO)' },
        { status: 400 }
      );
    }

    // Start a transaction to update market and settle positions
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update market
      const market = await tx.market.update({
        where: { id: marketId },
        data: {
          resolved: true,
          outcome,
          resolvedAt: new Date(),
          status: 'resolved'
        }
      });

      // Get all positions for this market
      const positions = await tx.position.findMany({
        where: { marketId },
        include: { user: true }
      });

      // Settle each position
      for (const position of positions) {
        const yesShares = Number(position.yesShares);
        const noShares = Number(position.noShares);
        const yesCost = yesShares * Number(position.avgYesCost);
        const noCost = noShares * Number(position.avgNoCost);
        const totalCost = yesCost + noCost;
        
        // Calculate winnings based on outcome
        let winningShares = 0;
        if (outcome) {
          // YES won - each YES share pays $1
          winningShares = yesShares;
        } else {
          // NO won - each NO share pays $1
          winningShares = noShares;
        }

        const totalPayout = winningShares; // Each winning share pays $1
        const netProfit = totalPayout - totalCost;

        // Update user balance with NET PROFIT (not gross payout)
        await tx.user.update({
          where: { id: position.userId },
          data: {
            usdcBalance: {
              increment: netProfit // Add profit (can be negative for losers)
            },
            lockedBalance: {
              decrement: totalCost // Unlock the original cost
            }
          }
        });

        // Update position with realized P&L
        await tx.position.update({
          where: { id: position.id },
          data: {
            realizedPnL: netProfit
          }
        });
      }

      return market;
    });

    return NextResponse.json({
      success: true,
      market: result,
      message: 'Market resolved and positions settled'
    });
  } catch (error) {
    console.error('Error resolving market:', error);
    return NextResponse.json(
      { error: 'Failed to resolve market' },
      { status: 500 }
    );
  }
}