import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all orders for a user or market
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const marketId = searchParams.get('marketId');
    if (!userId && !marketId) {
      return NextResponse.json(
        { error: 'userId or marketId required' },
        { status: 400 }
      );
    }
    const where: any = {};
    if (userId) where.userId = userId;
    if (marketId) where.marketId = parseInt(marketId);
    const orders = await prisma.order.findMany({
      where,
      include: {
        market: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
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
    const { userId, marketId, side, direction, type, price, quantity } = body;
    
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
    
    // Check user has sufficient balance
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    if (direction === 'buy') {
      const cost = price * quantity;
      const availableBalance = Number(user.usdcBalance) - Number(user.lockedBalance);
      if (availableBalance < cost) {
        return NextResponse.json(
          { error: 'Insufficient balance' },
          { status: 400 }
        );
      }
    } else {
      // Short selling - lock collateral
      const cost = (1 - price) * quantity;
      const availableBalance = Number(user.usdcBalance) - Number(user.lockedBalance);
      if (availableBalance < cost) {
        return NextResponse.json(
          { error: 'Insufficient balance for short position' },
          { status: 400 }
        );
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
        status: 'open'
      }
    });
    
    // Lock funds
    const cost = direction === 'buy' ? (price * quantity) : ((1 - price) * quantity);
    await prisma.user.update({
      where: { id: userId },
      data: {
        lockedBalance: { increment: cost }
      }
    });
    
    // Try to match the order
    await matchOrder(prisma, order, parseInt(marketId));
    
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
    
    // Cancel order
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'cancelled' }
    });
    
    // Unlock funds
    const lockedAmount = order.direction === 'buy' 
      ? Number(order.price) * Number(order.remaining)
      : (1 - Number(order.price)) * Number(order.remaining);
      
    await prisma.user.update({
      where: { id: order.userId },
      data: {
        lockedBalance: { decrement: lockedAmount }
      }
    });
    
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
// MATCHING ENGINE
// ============================================================================
async function matchOrder(prisma: any, newOrder: any, marketId: number) {
  const oppositeDirection = newOrder.direction === 'buy' ? 'sell' : 'buy';
  
  const opposingOrders = await prisma.order.findMany({
    where: {
      marketId,
      side: newOrder.side,
      direction: oppositeDirection,
      status: { in: ['open', 'partial'] },
      remaining: { gt: 0 }
    },
    orderBy: newOrder.direction === 'buy' 
      ? [{ price: 'asc' }, { createdAt: 'asc' }]
      : [{ price: 'desc' }, { createdAt: 'asc' }]
  });
  
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
        quantity: matchQty
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
    
    // Settle trades
    await settleTradeForBuyer(prisma, buyOrder.userId, marketId, newOrder.side, matchQty, executionPrice);
    await settleTradeForSeller(prisma, sellOrder.userId, marketId, newOrder.side, matchQty, executionPrice);
    
    // Update market stats
    await updateMarketStats(prisma, marketId, matchQty, buyOrder.userId, sellOrder.userId);
  }
}

async function settleTradeForBuyer(
  prisma: any,
  userId: string,
  marketId: number,
  side: string,
  quantity: number,
  price: number
) {
  const cost = quantity * price;
  
  await prisma.user.update({
    where: { id: userId },
    data: { lockedBalance: { decrement: cost } }
  });
  
  const position = await prisma.position.findUnique({
    where: { userId_marketId: { userId, marketId } }
  });
  
  const field = side === 'yes' ? 'yesShares' : 'noShares';
  const costField = side === 'yes' ? 'avgYesCost' : 'avgNoCost';
  
  if (position) {
    const currentShares = Number(position[field]);
    const currentCost = Number(position[costField]);
    const newShares = currentShares + quantity;
    const newAvgCost = newShares > 0 
      ? ((currentShares * currentCost) + (quantity * price)) / newShares 
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
        yesShares: side === 'yes' ? quantity : 0,
        noShares: side === 'no' ? quantity : 0,
        avgYesCost: side === 'yes' ? price : 0,
        avgNoCost: side === 'no' ? price : 0
      }
    });
  }
}

async function settleTradeForSeller(
  prisma: any,
  userId: string,
  marketId: number,
  side: string,
  quantity: number,
  price: number
) {
  const proceeds = quantity * price;
  const collateral = quantity * (1 - price);
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      usdcBalance: { increment: proceeds },
      lockedBalance: { decrement: collateral }
    }
  });
}

async function updateMarketStats(
  prisma: any,
  marketId: number,
  tradeQuantity: number,
  buyerUserId: string,
  sellerUserId: string
) {
  try {
    // Get all trades for unique trader count
    const allTrades = await prisma.trade.findMany({
      where: { marketId },
      select: { buyerUserId: true, sellerUserId: true }
    });
    
    const uniqueTraders = new Set<string>();
    allTrades.forEach(trade => {
      uniqueTraders.add(trade.buyerUserId);
      uniqueTraders.add(trade.sellerUserId);
    });
    
    // Get current volume
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
    await prisma.priceHistory.create({
      data: {
        marketId,
        yesPrice: side === 'yes' ? price : 0,
        noPrice: side === 'no' ? price : 0,
        volume: quantity,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error recording price history:', error);
  }
}