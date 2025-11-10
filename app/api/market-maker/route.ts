// app/api/market-maker/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { 
  startMarketMaker, 
  stopMarketMaker, 
  syncAllMarkets,
  getMarketMakerStatus 
} from '@/lib/services/marketMakerService';

// GET - Get status or trigger manual sync
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'sync') {
      // Manual sync trigger
      const result = await syncAllMarkets();
      return NextResponse.json({
        message: 'Manual sync completed',
        ...result
      });
    }

    // Default: return status
    const status = getMarketMakerStatus();
    return NextResponse.json({
      status: status.running ? 'running' : 'stopped',
      interval: status.interval,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in market maker API:', error);
    return NextResponse.json(
      { error: 'Failed to get market maker status' },
      { status: 500 }
    );
  }
}

// POST - Start/stop market maker
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, interval } = body;

    if (action === 'start') {
      const started = startMarketMaker(interval || 15);
      return NextResponse.json({
        success: started,
        message: started 
          ? 'Market maker started' 
          : 'Market maker already running',
        interval: interval || 15
      });
    }

    if (action === 'stop') {
      const stopped = stopMarketMaker();
      return NextResponse.json({
        success: stopped,
        message: stopped 
          ? 'Market maker stopped' 
          : 'Market maker not running'
      });
    }

    if (action === 'restart') {
      stopMarketMaker();
      const started = startMarketMaker(interval || 15);
      return NextResponse.json({
        success: started,
        message: 'Market maker restarted',
        interval: interval || 15
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: start, stop, restart' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in market maker API:', error);
    return NextResponse.json(
      { error: 'Failed to control market maker' },
      { status: 500 }
    );
  }
}