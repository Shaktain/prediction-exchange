// app/api/batch-settlement/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  runBlockchainBatchSettlement, 
  getBlockchainBatchSettlementStatus 
} from '@/lib/services/batchSettlementBlockchain';

/**
 * GET - Get batch settlement status
 */
export async function GET(request: NextRequest) {
  try {
    const status = await getBlockchainBatchSettlementStatus();
    
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

/**
 * POST - Run batch settlement (submit to blockchain)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting blockchain batch settlement...');
    
    const result = await runBlockchainBatchSettlement();

    if (result.tradesProcessed === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending trades to settle',
        result,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully settled ${result.tradesProcessed} trades on-chain`,
      result: {
        tradesProcessed: result.tradesProcessed,
        ordersInBatch: result.ordersInBatch,
        totalVolume: result.totalVolume,
        gasUsed: result.gasUsed.toString(),
        txHash: result.txHash,
        explorerUrl: `https://sepolia.basescan.org/tx/${result.txHash}`,
      },
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