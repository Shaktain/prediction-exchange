import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const marketId = parseInt(params.id);

    if (isNaN(marketId)) {
      return NextResponse.json(
        { error: 'Invalid market ID' },
        { status: 400 }
      );
    }

    // Get current price
    const market = await prisma.market.findUnique({
      where: { id: marketId }
    });

    if (!market) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    const currentPrice = Number(market.yesPrice);

    // Get price from 24h ago (or earliest available)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const historicalPrice = await prisma.priceHistory.findFirst({
      where: {
        marketId: marketId,
        timestamp: { lte: twentyFourHoursAgo }
      },
      orderBy: { timestamp: 'desc' }
    });

    let priceChange = 0;

    if (historicalPrice) {
      const oldPrice = Number(historicalPrice.yesPrice);
      // Calculate change in percentage points (1 point = 1%)
      priceChange = Math.round((currentPrice - oldPrice) * 100);
    }

    return NextResponse.json({ priceChange });
  } catch (error) {
    console.error('Error calculating price change:', error);
    return NextResponse.json(
      { error: 'Failed to calculate price change' },
      { status: 500 }
    );
  }
}