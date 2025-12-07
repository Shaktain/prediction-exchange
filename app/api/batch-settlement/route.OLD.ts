// app/api/batch-settlement/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { runBatchSettlement, getBatchSettlementStatus } from '@/lib/services/batchSettlement';

/**
 * POST - Trigger batch settlement
 * This endpoint processes pending trades and prepares them for on-chain settlement
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Batch settlement triggered');
    
    const metrics = await runBatchSettlement();
    
    return NextResponse.json({
      success: true,
      message: 'Batch settlement completed',
      metrics,
    });

  } catch (error: any) {
    console.error('❌ Batch settlement failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Batch settlement failed' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Get batch settlement status
 * Returns current queue status and processing state
 */
export async function GET(request: NextRequest) {
  try {
    const status = await getBatchSettlementStatus();
    
    return NextResponse.json({
      success: true,
      status,
    });

  } catch (error: any) {
    console.error('❌ Failed to get batch status:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to get status' 
      },
      { status: 500 }
    );
  }
}