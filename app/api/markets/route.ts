import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to calculate price change
async function calculatePriceChange(marketId: number): Promise<number> {
  try {
    const market = await prisma.market.findUnique({ where: { id: marketId } });
    if (!market) return 0;

    const currentPrice = Number(market.yesPrice);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const historicalPrice = await prisma.priceHistory.findFirst({
      where: {
        marketId: marketId,
        timestamp: { lte: twentyFourHoursAgo }
      },
      orderBy: { timestamp: 'desc' }
    });

    if (!historicalPrice) return 0;

    const oldPrice = Number(historicalPrice.yesPrice);
    return Math.round((currentPrice - oldPrice) * 100);
  } catch (error) {
    console.error(`Error calculating price change for market ${marketId}:`, error);
    return 0;
  }
}

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
        volume24h: 'desc'
      }
    });

    // Calculate price changes for standalone markets
    const standaloneMarketsWithChanges = await Promise.all(
      standaloneMarkets.map(async (market) => {
        const priceChange = await calculatePriceChange(market.id);
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
          priceChange
        };
      })
    );

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
            yesPrice: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Filter out empty market groups
    const activeMarketGroups = marketGroups.filter(group => group.markets.length > 0);

    // Calculate aggregate stats and price changes for each market group
    const enrichedMarketGroups = await Promise.all(
      activeMarketGroups.map(async (group) => {
        const totalVolume = group.markets.reduce((sum, m) => sum + Number(m.totalVolume), 0);
        const totalVolume24h = group.markets.reduce((sum, m) => sum + Number(m.volume24h || 0), 0);
        const totalLiquidity = group.markets.reduce((sum, m) => sum + Number(m.totalLiquidity), 0);
        
        const trending = totalVolume24h > totalVolume * 0.1;

        // Calculate price changes for all options
        const optionsWithChanges = await Promise.all(
          group.markets.map(async (m) => {
            const priceChange = await calculatePriceChange(m.id);
            return {
              id: m.id,
              optionText: m.optionText,
              yesPrice: Number(m.yesPrice),
              noPrice: Number(m.noPrice),
              totalVolume: Number(m.totalVolume),
              totalLiquidity: Number(m.totalLiquidity),
              traderCount: m.traderCount,
              endDate: m.endDate,
              resolved: m.resolved,
              outcome: m.outcome,
              priceChange
            };
          })
        );

        return {
          id: group.id,
          type: 'group' as const,
          question: group.question,
          description: group.description,
          category: group.category,
          thumbnail: group.thumbnail,
          options: optionsWithChanges,
          totalVolume,
          totalVolume24h,
          totalLiquidity,
          trending,
          createdAt: group.createdAt
        };
      })
    );

    // Combine and sort by trending first, then by volume
    const allMarkets = [
      ...enrichedMarketGroups,
      ...standaloneMarketsWithChanges
    ].sort((a, b) => {
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