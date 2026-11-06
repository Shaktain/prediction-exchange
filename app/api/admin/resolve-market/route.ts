// app/api/admin/resolve-market/route.ts (IMPROVED)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { marketId, outcome, optionId } = await request.json();

    // Validate inputs
    if (!marketId || !outcome) {
      return NextResponse.json(
        { error: 'Missing marketId or outcome' },
        { status: 400 }
      );
    }

    // Check if market exists
    const market = await prisma.market.findUnique({
      where: { id: parseInt(marketId) },
      include: {
        options: true,
      },
    });

    if (!market) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    // Check if already resolved
    if (market.resolved) {
      return NextResponse.json(
        { error: 'Market already resolved' },
        { status: 400 }
      );
    }

    // For multi-option markets, validate optionId
    if (market.options.length > 0 && outcome === 'yes' && !optionId) {
      return NextResponse.json(
        { error: 'Must specify which option won for multi-option markets' },
        { status: 400 }
      );
    }

    // Determine the resolved outcome text
    let resolvedOutcome = outcome;
    if (optionId) {
      const winningOption = market.options.find(opt => opt.id === optionId);
      if (winningOption) {
        resolvedOutcome = winningOption.text;
      }
    }

    // Resolve the market in database
    await prisma.market.update({
      where: { id: parseInt(marketId) },
      data: {
        resolved: true,
        resolvedOutcome,
        resolvedAt: new Date(),
      },
    });

    console.log(`✅ Market ${marketId} resolved: ${resolvedOutcome}`);

    return NextResponse.json({
      success: true,
      marketId,
      outcome: resolvedOutcome,
    });

  } catch (error: any) {
    console.error('Failed to resolve market:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}