// app/api/redemption/redeemable/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth'; // Assumes you have user auth

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all resolved markets where user has winning positions
    const positions = await prisma.position.findMany({
      where: {
        userId: user.id,
        market: {
          resolved: true,
        },
      },
      include: {
        market: {
          select: {
            id: true,
            question: true,
            resolved: true,
            resolvedOutcome: true,
          },
        },
      },
    });

    // Filter to only winning positions that haven't been redeemed
    const redeemableMarkets = positions
      .filter((position) => {
        const market = position.market;
        
        // Check if user's position matches the winning outcome
        // For YES/NO markets
        if (market.resolvedOutcome === 'yes' && position.yesShares > 0) {
          return true;
        }
        if (market.resolvedOutcome === 'no' && position.noShares > 0) {
          return true;
        }
        
        // For multi-option markets (if position matches winning option text)
        // This requires storing which specific option the user holds
        // For now, simplified logic
        
        return false;
      })
      .map((position) => ({
        marketId: position.market.id,
        question: position.market.question,
        resolvedOutcome: position.market.resolvedOutcome || 'unknown',
        sharesHeld: position.market.resolvedOutcome === 'yes' 
          ? Number(position.yesShares) 
          : Number(position.noShares),
        potentialWinnings: position.market.resolvedOutcome === 'yes'
          ? Number(position.yesShares)
          : Number(position.noShares),
      }));

    return NextResponse.json({
      success: true,
      markets: redeemableMarkets,
    });

  } catch (error: any) {
    console.error('Failed to fetch redeemable markets:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}