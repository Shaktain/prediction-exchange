import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Market Maker Helper Functions
const MARKET_MAKER_WALLET = '0xMARKET_MAKER_SYSTEM';
let marketMakerIdCache: string | null = null;

async function getMarketMakerId(prisma: any): Promise<string | null> {
  if (marketMakerIdCache) return marketMakerIdCache;
  
  const marketMaker = await prisma.user.findUnique({
    where: { walletAddress: MARKET_MAKER_WALLET }
  });
  
  if (marketMaker) {
    marketMakerIdCache = marketMaker.id;
  }
  
  return marketMakerIdCache;
}

async function isMarketMaker(prisma: any, userId: string): Promise<boolean> {
  const marketMakerId = await getMarketMakerId(prisma);
  return marketMakerId === userId;
}

// GET all orders for a user or market
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const marketId = searchParams.get('marketId');
    const mode = searchParams.get('mode') || 'demo';
    
    if (!userId && !marketId) {
      return NextResponse.json(
        { error: 'userId or marketId required' },
        { status: 400 }
      );
    }
    
    const where: any = { mode };
    if (userId) where.userId = userId;
    if (marketId) where.marketId = parseInt(marketId);
    
    console.log('📋 Fetching orders with filter:', where);
    
    const orders = await prisma.order.findMany({
      where,
      include: {
        market: {
          include: {
            marketGroup: true  // Include parent market group if it exists
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`✅ Found ${orders.length} orders for mode: ${mode}`);
    
    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// POST create new order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, marketId, side, direction, type, price, quantity, mode = 'demo' } = body;
    
    // Validation
    if (!userId || !marketId || !side || !direction || !type || !price || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    if (side !== 'yes' && side !== 'no') {
      return NextResponse.json(
        { error: 'Invalid side. Must be yes or no' },
        { status: 400 }
      );
    }
    
    if (direction !== 'buy' && direction !== 'sell') {
      return NextResponse.json(
        { error: 'Invalid direction. Must be buy or sell' },
        { status: 400 }
      );
    }
    
    if (type !== 'limit' && type !== 'market') {
      return NextResponse.json(
        { error: 'Invalid type. Must be limit or market' },
        { status: 400 }
      );
    }

    if (mode !== 'demo' && mode !== 'real') {
      return NextResponse.json(
        { error: 'Invalid mode. Must be demo or real' },
        { status: 400 }
      );
    }
    
    // Get user and position
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const position = await prisma.position.findUnique({
      where: { 
        userId_marketId_mode: { 
          userId, 
          marketId: parseInt(marketId),
          mode
        } 
      }
    });
    
    // Get correct balances based on mode
    const totalBalance = mode === 'demo' 
      ? Number(user.demoBalance) 
      : Number(user.usdcBalance);
    
    const lockedBalance = mode === 'demo'
      ? Number(user.demoLockedBalance)
      : Number(user.realLockedBalance);
    
    const availableBalance = totalBalance - lockedBalance;
    const field = side === 'yes' ? 'yesShares' : 'noShares';
    const currentShares = position ? Number(position[field]) : 0;
    
    console.log(`💰 Order Validation - Mode: ${mode}, Available: ${availableBalance}, Locked: ${lockedBalance}`);
    
    if (direction === 'buy') {
      // BUYING: Need balance to pay for shares
      const cost = price * quantity;
      
      if (availableBalance < cost) {
        return NextResponse.json(
          { error: `Insufficient ${mode} balance. Need $${cost.toFixed(2)}, have $${availableBalance.toFixed(2)}` },
          { status: 400 }
        );
      }
    } else {
      // SELLING: Two scenarios
      
      if (currentShares >= quantity) {
        // SCENARIO 1: Closing existing long position (have shares to sell)
        // No additional balance needed - just selling what we own
        console.log(`  ✓ Selling owned shares: ${currentShares} >= ${quantity}`);
      } else {
        // SCENARIO 2: Short selling (don't have enough shares)
        const shortQuantity = quantity - currentShares;
        
        // For short selling, need collateral to cover max loss
        // Max loss = if wrong, pay $1 per share
        // Collateral needed = shortQuantity × (1 - price)
        const collateralNeeded = shortQuantity * (1 - price);
        
        console.log(`  ⚠️ Short selling: need collateral ${collateralNeeded.toFixed(2)}`);
        
        if (availableBalance < collateralNeeded) {
          return NextResponse.json(
            { 
              error: `Insufficient ${mode} collateral for short sale. Need $${collateralNeeded.toFixed(2)}, have $${availableBalance.toFixed(2)}. You're short selling ${shortQuantity} shares.` 
            },
            { status: 400 }
          );
        }
      }
    }
    
    // Create order
    const order = await prisma.order.create({
      data: {
        userId,
        marketId: parseInt(marketId),
        side,
        direction,
        type,
        price,
        quantity,
        remaining: quantity,
        status: 'open',
        mode
      }
    });
    
    console.log(`📝 Order created: ${order.id}`);
    
    // Lock funds in correct balance
    let lockAmount = 0;
    if (direction === 'buy') {
      lockAmount = price * quantity;
    } else {
      // Only lock collateral for short portion
      const shortQuantity = Math.max(0, quantity - currentShares);
      lockAmount = shortQuantity * (1 - price);
    }
    
    if (lockAmount > 0) {
      console.log(`🔒 Locking ${lockAmount.toFixed(2)} in ${mode} mode`);
      
      if (mode === 'demo') {
        await prisma.user.update({
          where: { id: userId },
          data: {
            demoLockedBalance: { increment: lockAmount }
          }
        });
      } else {
        await prisma.user.update({
          where: { id: userId },
          data: {
            realLockedBalance: { increment: lockAmount }
          }
        });
      }
    }
    
    // Try to match the order
    await matchOrder(prisma, order, parseInt(marketId), mode);
    
    // Update liquidity
    await updateLiquidity(prisma, parseInt(marketId));
    
    return NextResponse.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

// DELETE cancel order
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('orderId');
    const mode = searchParams.get('mode') || 'demo';
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId required' },
        { status: 400 }
      );
    }
    
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    if (order.status !== 'open' && order.status !== 'partial') {
      return NextResponse.json(
        { error: 'Cannot cancel non-open order' },
        { status: 400 }
      );
    }
    
    // Get user's position to calculate unlock amount correctly
    const position = await prisma.position.findUnique({
      where: { 
        userId_marketId_mode: { 
          userId: order.userId, 
          marketId: order.marketId,
          mode
        } 
      }
    });
    
    const field = order.side === 'yes' ? 'yesShares' : 'noShares';
    const currentShares = position ? Number(position[field]) : 0;
    
    // Calculate locked amount
    let lockedAmount = 0;
    if (order.direction === 'buy') {
      lockedAmount = Number(order.price) * Number(order.remaining);
    } else {
      const orderQty = Number(order.quantity);
      const remainingQty = Number(order.remaining);
      const shortQuantity = Math.max(0, orderQty - currentShares);
      const remainingShort = (remainingQty / orderQty) * shortQuantity;
      lockedAmount = remainingShort * (1 - Number(order.price));
    }
    
    // Cancel order
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'cancelled' }
    });
    
    // Unlock funds from correct balance
    if (lockedAmount > 0) {
      if (mode === 'demo') {
        await prisma.user.update({
          where: { id: order.userId },
          data: {
            demoLockedBalance: { decrement: lockedAmount }
          }
        });
      } else {
        await prisma.user.update({
          where: { id: order.userId },
          data: {
            realLockedBalance: { decrement: lockedAmount }
          }
        });
      }
    }
    
    // Update liquidity
    await updateLiquidity(prisma, order.marketId);
    
    return NextResponse.json({
      success: true,
      message: 'Order cancelled'
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    );
  }
}

// ============================================================================
// MATCHING ENGINE WITH MODE SUPPORT AND MARKET MAKER SKIP
// ============================================================================
async function matchOrder(prisma: any, newOrder: any, marketId: number, mode: string) {
  console.log('🔍 MATCHING ORDER:', {
    orderId: newOrder.id,
    side: newOrder.side,
    direction: newOrder.direction,
    price: newOrder.price,
    quantity: newOrder.quantity,
    mode
  });

  const oppositeDirection = newOrder.direction === 'buy' ? 'sell' : 'buy';
  
  // CRITICAL: Only match orders with the same mode
  const opposingOrders = await prisma.order.findMany({
    where: {
      marketId,
      side: newOrder.side,
      direction: oppositeDirection,
      mode: mode,
      status: { in: ['open', 'partial'] },
      remaining: { gt: 0 }
    },
    orderBy: newOrder.direction === 'buy' 
      ? [{ price: 'asc' }, { createdAt: 'asc' }]
      : [{ price: 'desc' }, { createdAt: 'asc' }]
  });
  
  console.log(`📊 Found ${opposingOrders.length} opposing ${mode} orders`);
  
  let remainingQty = Number(newOrder.remaining);
  
  for (const opposingOrder of opposingOrders) {
    if (remainingQty <= 0) break;
    
    const newPrice = Number(newOrder.price);
    const oppPrice = Number(opposingOrder.price);
    
    let pricesCross = false;
    if (newOrder.direction === 'buy') {
      pricesCross = newPrice >= oppPrice;
    } else {
      pricesCross = oppPrice >= newPrice;
    }
    
    if (!pricesCross) continue;
    
    const matchQty = Math.min(remainingQty, Number(opposingOrder.remaining));
    const executionPrice = oppPrice;
    
    console.log(`✅ MATCH! quantity=${matchQty}, executionPrice=${executionPrice}`);
    
    const buyOrder = newOrder.direction === 'buy' ? newOrder : opposingOrder;
    const sellOrder = newOrder.direction === 'sell' ? newOrder : opposingOrder;
    
    // Create trade
    await prisma.trade.create({
      data: {
        marketId,
        buyOrderId: buyOrder.id,
        sellOrderId: sellOrder.id,
        buyerUserId: buyOrder.userId,
        sellerUserId: sellOrder.userId,
        side: newOrder.side,
        price: executionPrice,
        quantity: matchQty,
        mode
      }
    });
    
    // Record price history
    await recordPriceHistory(prisma, marketId, newOrder.side, executionPrice, matchQty);
    
    // Update orders
    remainingQty -= matchQty;
    await prisma.order.update({
      where: { id: newOrder.id },
      data: {
        filled: { increment: matchQty },
        remaining: { decrement: matchQty },
        status: remainingQty === 0 ? 'filled' : 'partial'
      }
    });
    
    const oppRemaining = Number(opposingOrder.remaining) - matchQty;
    await prisma.order.update({
      where: { id: opposingOrder.id },
      data: {
        filled: { increment: matchQty },
        remaining: { decrement: matchQty },
        status: oppRemaining === 0 ? 'filled' : 'partial'
      }
    });
    
    // Settle trades with FIFO logic - BUT SKIP MARKET MAKER
    const buyerIsMarketMaker = await isMarketMaker(prisma, buyOrder.userId);
    const sellerIsMarketMaker = await isMarketMaker(prisma, sellOrder.userId);
    
    // Only settle for real users, not market maker
    if (!buyerIsMarketMaker) {
      console.log(`  💰 Settling for buyer: ${buyOrder.userId}`);
      await settleTradeForBuyer(prisma, buyOrder.userId, marketId, newOrder.side, matchQty, executionPrice, mode);
    } else {
      console.log(`  🤖 Skipping settlement for market maker (buyer)`);
    }
    
    if (!sellerIsMarketMaker) {
      console.log(`  💵 Settling for seller: ${sellOrder.userId}`);
      await settleTradeForSeller(prisma, sellOrder.userId, marketId, newOrder.side, matchQty, executionPrice, mode);
    } else {
      console.log(`  🤖 Skipping settlement for market maker (seller)`);
    }
    
    // Update market stats
    await updateMarketStats(prisma, marketId, matchQty, buyOrder.userId, sellOrder.userId);
  }
  
  console.log(`🏁 Matching complete. Remaining: ${remainingQty}`);
}

async function settleTradeForBuyer(
  prisma: any,
  userId: string,
  marketId: number,
  side: string,
  quantity: number,
  price: number,
  mode: string
) {
  console.log(`💰 SETTLE BUYER - userId: ${userId}, mode: ${mode}, qty: ${quantity}, price: ${price}`);
  
  const cost = quantity * price;
  
  // Unlock the buyer's locked funds AND deduct from balance
  if (mode === 'demo') {
    await prisma.user.update({
      where: { id: userId },
      data: { 
        demoLockedBalance: { decrement: cost },
        demoBalance: { decrement: cost }
      }
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { 
        realLockedBalance: { decrement: cost },
        usdcBalance: { decrement: cost }
      }
    });
  }
  
  console.log(`  ✓ Unlocked and deducted ${cost} from ${mode} balance`);
  
  // Update or create position
  const position = await prisma.position.findUnique({
    where: { 
      userId_marketId_mode: { 
        userId, 
        marketId,
        mode
      } 
    }
  });
  
  const field = side === 'yes' ? 'yesShares' : 'noShares';
  const costField = side === 'yes' ? 'avgYesCost' : 'avgNoCost';
  
  if (position) {
    const currentShares = Number(position[field]);
    const currentCost = Number(position[costField]);
    
    if (currentShares < 0) {
      // Buying back a short - FIFO
      const closingQty = Math.min(quantity, Math.abs(currentShares));
      const openingQty = quantity - closingQty;
      const realizedPnL = closingQty * (currentCost - price);
      
      const newShares = currentShares + quantity;
      const newAvgCost = newShares > 0 ? (openingQty * price) / newShares : newShares < 0 ? currentCost : 0;
      
      await prisma.position.update({
        where: { id: position.id },
        data: {
          [field]: newShares,
          [costField]: newAvgCost,
          realizedPnL: { increment: realizedPnL }
        }
      });
      
      // Add P&L to correct balance
      if (realizedPnL !== 0) {
        if (mode === 'demo') {
          await prisma.user.update({
            where: { id: userId },
            data: { demoBalance: { increment: realizedPnL } }
          });
        } else {
          await prisma.user.update({
            where: { id: userId },
            data: { usdcBalance: { increment: realizedPnL } }
          });
        }
      }
    } else {
      // Adding to long position
      const newShares = currentShares + quantity;
      const newAvgCost = ((currentShares * currentCost) + (quantity * price)) / newShares;
      
      await prisma.position.update({
        where: { id: position.id },
        data: {
          [field]: newShares,
          [costField]: newAvgCost
        }
      });
    }
  } else {
    // New position
    await prisma.position.create({
      data: {
        userId,
        marketId,
        mode,
        yesShares: side === 'yes' ? quantity : 0,
        noShares: side === 'no' ? quantity : 0,
        avgYesCost: side === 'yes' ? price : 0,
        avgNoCost: side === 'no' ? price : 0
      }
    });
  }
  
  console.log(`✅ BUYER SETTLEMENT COMPLETE`);
}

async function settleTradeForSeller(
  prisma: any,
  userId: string,
  marketId: number,
  side: string,
  quantity: number,
  price: number,
  mode: string
) {
  console.log(`💵 SETTLE SELLER - userId: ${userId}, mode: ${mode}, qty: ${quantity}, price: ${price}`);
  
  const proceeds = quantity * price;
  
  const position = await prisma.position.findUnique({
    where: { 
      userId_marketId_mode: { 
        userId, 
        marketId,
        mode
      } 
    }
  });
  
  const field = side === 'yes' ? 'yesShares' : 'noShares';
  const costField = side === 'yes' ? 'avgYesCost' : 'avgNoCost';
  const currentShares = position ? Number(position[field]) : 0;
  const avgCost = position ? Number(position[costField]) : 0;
  
  if (currentShares > 0) {
    // Closing long position - FIFO
    const closingQty = Math.min(quantity, currentShares);
    const shortingQty = quantity - closingQty;
    const costBasis = avgCost * closingQty;
    const realizedPnL = proceeds - costBasis - (shortingQty * price);
    
    // Add proceeds to correct balance
    if (mode === 'demo') {
      await prisma.user.update({
        where: { id: userId },
        data: { demoBalance: { increment: proceeds } }
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { usdcBalance: { increment: proceeds } }
      });
    }
    
    const newShares = currentShares - quantity;
    
    if (position) {
      await prisma.position.update({
        where: { id: position.id },
        data: {
          [field]: newShares,
          realizedPnL: { increment: realizedPnL }
        }
      });
    }
    
    // Unlock collateral for short portion
    if (shortingQty > 0) {
      const collateral = shortingQty * (1 - price);
      if (mode === 'demo') {
        await prisma.user.update({
          where: { id: userId },
          data: { demoLockedBalance: { decrement: collateral } }
        });
      } else {
        await prisma.user.update({
          where: { id: userId },
          data: { realLockedBalance: { decrement: collateral } }
        });
      }
    }
  } else {
    // Opening/adding to short
    const collateral = quantity * (1 - price);
    
    if (mode === 'demo') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          demoBalance: { increment: proceeds },
          demoLockedBalance: { decrement: collateral }
        }
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: {
          usdcBalance: { increment: proceeds },
          realLockedBalance: { decrement: collateral }
        }
      });
    }
    
    if (position) {
      const newShares = currentShares - quantity;
      const totalShares = Math.abs(newShares);
      const newAvgCost = totalShares > 0
        ? ((Math.abs(currentShares) * avgCost) + (quantity * price)) / totalShares
        : 0;
      
      await prisma.position.update({
        where: { id: position.id },
        data: {
          [field]: newShares,
          [costField]: newAvgCost
        }
      });
    } else {
      await prisma.position.create({
        data: {
          userId,
          marketId,
          mode,
          yesShares: side === 'yes' ? -quantity : 0,
          noShares: side === 'no' ? -quantity : 0,
          avgYesCost: side === 'yes' ? price : 0,
          avgNoCost: side === 'no' ? price : 0
        }
      });
    }
  }
  
  console.log(`✅ SELLER SETTLEMENT COMPLETE`);
}

async function updateMarketStats(
  prisma: any,
  marketId: number,
  tradeQuantity: number,
  buyerUserId: string,
  sellerUserId: string
) {
  try {
    const allTrades = await prisma.trade.findMany({
      where: { marketId },
      select: { buyerUserId: true, sellerUserId: true }
    });
    
    const uniqueTraders = new Set<string>();
    allTrades.forEach(trade => {
      uniqueTraders.add(trade.buyerUserId);
      uniqueTraders.add(trade.sellerUserId);
    });
    
    const market = await prisma.market.findUnique({
      where: { id: marketId },
      select: { totalVolume: true }
    });
    
    if (!market) return;
    
    const newVolume = Number(market.totalVolume) + tradeQuantity;
    
    await prisma.market.update({
      where: { id: marketId },
      data: {
        totalVolume: newVolume,
        traderCount: uniqueTraders.size
      }
    });
  } catch (error) {
    console.error('Error updating market stats:', error);
  }
}

async function updateLiquidity(prisma: any, marketId: number) {
  try {
    const openOrders = await prisma.order.findMany({
      where: {
        marketId,
        status: { in: ['open', 'partial'] }
      },
      select: { price: true, remaining: true }
    });
    
    const liquidity = openOrders.reduce((sum, order) => {
      return sum + (Number(order.price) * Number(order.remaining));
    }, 0);
    
    await prisma.market.update({
      where: { id: marketId },
      data: { totalLiquidity: liquidity }
    });
  } catch (error) {
    console.error('Error updating liquidity:', error);
  }
}

async function recordPriceHistory(
  prisma: any,
  marketId: number,
  side: string,
  price: number,
  quantity: number
) {
  try {
    const market = await prisma.market.findUnique({
      where: { id: marketId },
      select: { yesPrice: true, noPrice: true }
    });
    
    if (!market) return;
    
    if (side === 'yes') {
      await prisma.market.update({
        where: { id: marketId },
        data: { 
          yesPrice: price,
          noPrice: 1 - price
        }
      });
    } else {
      await prisma.market.update({
        where: { id: marketId },
        data: { 
          noPrice: price,
          yesPrice: 1 - price
        }
      });
    }
    
    await prisma.priceHistory.create({
      data: {
        marketId,
        yesPrice: side === 'yes' ? price : (1 - price),
        noPrice: side === 'no' ? price : (1 - price),
        volume: quantity,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error recording price history:', error);
  }
}