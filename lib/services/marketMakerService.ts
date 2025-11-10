// lib/services/marketMakerService.ts

import { prisma } from '@/lib/prisma';

const MARKET_MAKER_WALLET = '0xMARKET_MAKER_SYSTEM';
const MARKET_MAKER_INFINITE_BALANCE = 999999999;

// Singleton to track if market maker is running
let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

/**
 * Initialize or get the market maker user
 */
export async function getOrCreateMarketMaker() {
  let marketMaker = await prisma.user.findUnique({
    where: { walletAddress: MARKET_MAKER_WALLET }
  });

  if (!marketMaker) {
    console.log('📊 Creating market maker user...');
    marketMaker = await prisma.user.create({
      data: {
        walletAddress: MARKET_MAKER_WALLET,
        demoBalance: MARKET_MAKER_INFINITE_BALANCE,
        demoLockedBalance: 0,
        usdcBalance: 0,
        realLockedBalance: 0
      }
    });
    console.log('✅ Market maker user created:', marketMaker.id);
  }

  return marketMaker;
}

/**
 * Get real market order book for a specific market
 */
async function getRealOrderBook(marketId: number) {
  const [yesBids, yesAsks, noBids, noAsks] = await Promise.all([
    // YES Buy orders (Bids)
    prisma.order.findMany({
      where: {
        marketId,
        side: 'yes',
        direction: 'buy',
        mode: 'real',
        status: { in: ['open', 'partial'] },
        remaining: { gt: 0 }
      },
      orderBy: [{ price: 'desc' }, { createdAt: 'asc' }],
      select: { price: true, remaining: true }
    }),
    
    // YES Sell orders (Asks)
    prisma.order.findMany({
      where: {
        marketId,
        side: 'yes',
        direction: 'sell',
        mode: 'real',
        status: { in: ['open', 'partial'] },
        remaining: { gt: 0 }
      },
      orderBy: [{ price: 'asc' }, { createdAt: 'asc' }],
      select: { price: true, remaining: true }
    }),
    
    // NO Buy orders (Bids)
    prisma.order.findMany({
      where: {
        marketId,
        side: 'no',
        direction: 'buy',
        mode: 'real',
        status: { in: ['open', 'partial'] },
        remaining: { gt: 0 }
      },
      orderBy: [{ price: 'desc' }, { createdAt: 'asc' }],
      select: { price: true, remaining: true }
    }),
    
    // NO Sell orders (Asks)
    prisma.order.findMany({
      where: {
        marketId,
        side: 'no',
        direction: 'sell',
        mode: 'real',
        status: { in: ['open', 'partial'] },
        remaining: { gt: 0 }
      },
      orderBy: [{ price: 'asc' }, { createdAt: 'asc' }],
      select: { price: true, remaining: true }
    })
  ]);

  // Aggregate by price level (sum quantities at same price)
  const aggregateByPrice = (orders: any[]) => {
    const priceMap = new Map<number, number>();
    
    for (const order of orders) {
      const price = Number(order.price);
      const qty = Number(order.remaining);
      priceMap.set(price, (priceMap.get(price) || 0) + qty);
    }
    
    return Array.from(priceMap.entries())
      .map(([price, quantity]) => ({ price, quantity }))
      .sort((a, b) => b.price - a.price); // Descending by price
  };

  return {
    yesBids: aggregateByPrice(yesBids),
    yesAsks: aggregateByPrice(yesAsks),
    noBids: aggregateByPrice(noBids),
    noAsks: aggregateByPrice(noAsks)
  };
}

/**
 * Mirror real order book to demo with market maker orders
 */
async function mirrorOrderBookToDemo(marketId: number, marketMakerId: string) {
  // Get real market state
  const realBook = await getRealOrderBook(marketId);
  
  // Count total orders to create
  const totalOrders = 
    realBook.yesBids.length + 
    realBook.yesAsks.length + 
    realBook.noBids.length + 
    realBook.noAsks.length;

  if (totalOrders === 0) {
    console.log(`  ⚠️  Market ${marketId}: No real orders to mirror`);
    return 0;
  }

  // Delete existing market maker orders for this market
  await prisma.order.deleteMany({
    where: {
      marketId,
      mode: 'demo',
      userId: marketMakerId
    }
  });

  // Create mirror orders in demo
  const ordersToCreate = [];

  // Mirror YES Bids
  for (const bid of realBook.yesBids) {
    ordersToCreate.push({
      userId: marketMakerId,
      marketId,
      side: 'yes',
      direction: 'buy',
      mode: 'demo',
      type: 'limit',
      price: bid.price,
      quantity: bid.quantity,
      remaining: bid.quantity,
      filled: 0,
      status: 'open'
    });
  }

  // Mirror YES Asks
  for (const ask of realBook.yesAsks) {
    ordersToCreate.push({
      userId: marketMakerId,
      marketId,
      side: 'yes',
      direction: 'sell',
      mode: 'demo',
      type: 'limit',
      price: ask.price,
      quantity: ask.quantity,
      remaining: ask.quantity,
      filled: 0,
      status: 'open'
    });
  }

  // Mirror NO Bids
  for (const bid of realBook.noBids) {
    ordersToCreate.push({
      userId: marketMakerId,
      marketId,
      side: 'no',
      direction: 'buy',
      mode: 'demo',
      type: 'limit',
      price: bid.price,
      quantity: bid.quantity,
      remaining: bid.quantity,
      filled: 0,
      status: 'open'
    });
  }

  // Mirror NO Asks
  for (const ask of realBook.noAsks) {
    ordersToCreate.push({
      userId: marketMakerId,
      marketId,
      side: 'no',
      direction: 'sell',
      mode: 'demo',
      type: 'limit',
      price: ask.price,
      quantity: ask.quantity,
      remaining: ask.quantity,
      filled: 0,
      status: 'open'
    });
  }

  // Batch create all orders
  await prisma.order.createMany({
    data: ordersToCreate
  });

  console.log(`  ✅ Market ${marketId}: Mirrored ${ordersToCreate.length} orders to demo`);
  return ordersToCreate.length;
}

/**
 * Sync all active markets
 */
export async function syncAllMarkets() {
  try {
    console.log('🔄 Starting market maker sync...');
    
    // Get or create market maker
    const marketMaker = await getOrCreateMarketMaker();

    // Get all active (non-resolved) markets
    const activeMarkets = await prisma.market.findMany({
      where: { resolved: false },
      select: { id: true, title: true }
    });

    if (activeMarkets.length === 0) {
      console.log('  ⚠️  No active markets to sync');
      return { success: true, synced: 0, markets: 0 };
    }

    console.log(`  📊 Found ${activeMarkets.length} active markets`);

    let totalOrdersSynced = 0;

    // Sync each market
    for (const market of activeMarkets) {
      try {
        const orderCount = await mirrorOrderBookToDemo(market.id, marketMaker.id);
        totalOrdersSynced += orderCount;
      } catch (error) {
        console.error(`  ❌ Failed to sync market ${market.id}:`, error);
      }
    }

    console.log(`✅ Sync complete: ${totalOrdersSynced} total orders across ${activeMarkets.length} markets`);
    
    return {
      success: true,
      synced: totalOrdersSynced,
      markets: activeMarkets.length,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('❌ Market maker sync failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
  }
}

/**
 * Start the market maker background process
 */
export function startMarketMaker(intervalSeconds: number = 15) {
  if (isRunning) {
    console.log('⚠️  Market maker already running');
    return false;
  }

  console.log(`🚀 Starting market maker (sync every ${intervalSeconds}s)...`);
  
  // Run immediately
  syncAllMarkets();
  
  // Then run on interval
  intervalId = setInterval(() => {
    syncAllMarkets();
  }, intervalSeconds * 1000);

  isRunning = true;
  return true;
}

/**
 * Stop the market maker background process
 */
export function stopMarketMaker() {
  if (!isRunning || !intervalId) {
    console.log('⚠️  Market maker not running');
    return false;
  }

  clearInterval(intervalId);
  intervalId = null;
  isRunning = false;
  
  console.log('🛑 Market maker stopped');
  return true;
}

/**
 * Get market maker status
 */
export function getMarketMakerStatus() {
  return {
    running: isRunning,
    interval: intervalId ? 15 : null
  };
}