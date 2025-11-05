import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const marketId = searchParams.get('marketId');
    const side = searchParams.get('side'); // 'yes' or 'no'
    const timeframe = searchParams.get('timeframe'); // '1D', '3D', '1W', '1M', '1Y', 'MAX'

    if (!marketId || !side) {
      return NextResponse.json(
        { error: 'marketId and side required' },
        { status: 400 }
      );
    }

    // Calculate time range
    const now = new Date();
    let startDate = new Date(0); // Default to beginning of time for MAX
    
    switch (timeframe) {
      case '1D':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '3D':
        startDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        break;
      case '1W':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1M':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '1Y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    const priceHistory = await prisma.priceHistory.findMany({
      where: {
        marketId: parseInt(marketId),
        timestamp: { gte: startDate }
      },
      orderBy: { timestamp: 'asc' }
    });

    // Format data based on side
    const chartData = priceHistory
      .filter(record => side === 'yes' ? record.yesPrice > 0 : record.noPrice > 0)
      .map(record => ({
        timestamp: record.timestamp,
        price: Number(side === 'yes' ? record.yesPrice : record.noPrice),
        volume: Number(record.volume)
      }));

    return NextResponse.json({ data: chartData });
  } catch (error) {
    console.error('Error fetching price history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price history' },
      { status: 500 }
    );
  }
}