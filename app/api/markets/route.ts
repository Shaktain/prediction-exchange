import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    // Fetch standalone markets (not part of a group)
    const standaloneMarkets = await prisma.market.findMany({
      where: {
        marketGroupId: null,
        ...(status && status !== 'all' ? { status } : {}),
        ...(category && category !== 'All' ? { category } : {})
      },
      orderBy: {
        volume24h: 'desc' // Sort by 24h volume for trending
      }
    });

    // Fetch market groups with their options
    const marketGroups = await prisma.marketGroup.findMany({
      where: {
        ...(category && category !== 'All' ? { category } : {})
      },
      include: {
        markets: {
          where: {
            ...(status && status !== 'all' ? { status } : {})
          },
          orderBy: {
            yesPrice: 'desc' // Sort options by probability
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Filter out empty market groups (no markets matching status filter)
    const activeMarketGroups = marketGroups.filter(group => group.markets.length > 0);

    // Calculate aggregate stats for each market group
    const enrichedMarketGroups = activeMarketGroups.map(group => {
      const totalVolume = group.markets.reduce((sum, m) => sum + Number(m.totalVolume), 0);
      const totalVolume24h = group.markets.reduce((sum, m) => sum + Number(m.volume24h || 0), 0);
      const totalLiquidity = group.markets.reduce((sum, m) => sum + Number(m.totalLiquidity), 0);
      
      // Determine if trending (high 24h volume)
      const trending = totalVolume24h > totalVolume * 0.1; // 10% of total volume in 24h

      return {
        id: group.id,
        type: 'group' as const,
        question: group.question,
        description: group.description,
        category: group.category,
        thumbnail: group.thumbnail,
        options: group.markets.map(m => ({
          id: m.id,
          optionText: m.optionText,
          yesPrice: Number(m.yesPrice),
          noPrice: Number(m.noPrice),
          resolved: m.resolved,
          outcome: m.outcome
        })),
        totalVolume,
        totalVolume24h,
        totalLiquidity,
        trending,
        createdAt: group.createdAt
      };
    });

    // Transform standalone markets
    const enrichedStandaloneMarkets = standaloneMarkets.map(market => {
      const trending = Number(market.volume24h || 0) > Number(market.totalVolume) * 0.1;
      
      return {
        id: market.id,
        type: 'single' as const,
        title: market.title,
        category: market.category,
        yesPrice: Number(market.yesPrice),
        noPrice: Number(market.noPrice),
        totalVolume: Number(market.totalVolume),
        volume24h: Number(market.volume24h || 0),
        totalLiquidity: Number(market.totalLiquidity),
        endDate: market.endDate,
        resolved: market.resolved,
        outcome: market.outcome,
        trending,
        createdAt: market.createdAt
      };
    });

    // Combine and sort by creation date (or volume)
    const allMarkets = [
      ...enrichedMarketGroups,
      ...enrichedStandaloneMarkets
    ].sort((a, b) => {
      // Sort by trending first, then by volume
      if (a.trending && !b.trending) return -1;
      if (!a.trending && b.trending) return 1;
      return (b.totalVolume || 0) - (a.totalVolume || 0);
    });

    return NextResponse.json({ 
      markets: allMarkets,
      count: allMarkets.length
    });
  } catch (error) {
    console.error('Error fetching markets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}