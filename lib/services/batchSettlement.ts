// lib/services/batchSettlement.ts
import { prisma } from '@/lib/prisma';

interface BatchMetrics {
  tradesProcessed: number;
  ordersInBatch: number;
  totalVolume: number;
  gasEstimate: number;
}

/**
 * Batch Settlement Service
 * 
 * This service collects matched trades and prepares them for on-chain settlement.
 * In Phase 1, it simulates the batching process.
 * In Phase 2, it will actually submit to blockchain.
 */
export class BatchSettlementService {
  private isProcessing = false;
  private batchSize = 100; // Max trades per batch
  
  /**
   * Main batch processing function
   * Collects pending trades and prepares them for settlement
   */
  async processBatch(): Promise<BatchMetrics> {
    if (this.isProcessing) {
      console.log('⏭️  Batch already processing, skipping...');
      return { tradesProcessed: 0, ordersInBatch: 0, totalVolume: 0, gasEstimate: 0 };
    }

    this.isProcessing = true;
    console.log('🔄 Starting batch settlement process...');

    try {
      // 1. Get all pending trades from real mode with signatures
      const pendingTrades = await this.getPendingTrades();
      
      if (pendingTrades.length === 0) {
        console.log('✅ No pending trades to settle');
        return { tradesProcessed: 0, ordersInBatch: 0, totalVolume: 0, gasEstimate: 0 };
      }

      console.log(`📊 Found ${pendingTrades.length} pending trades`);

      // 2. Get order details for each trade
      const tradesWithOrders = await this.enrichTradesWithOrders(pendingTrades);

      // 3. Group trades by market for efficient batching
      const tradesByMarket = this.groupTradesByMarket(tradesWithOrders);

      // 4. Prepare batch data (simulate on-chain format)
      const batchData = await this.prepareBatchData(tradesByMarket);

      // 5. Validate signatures in batch
      const validationResults = await this.validateBatch(batchData);

      // 6. Calculate metrics
      const metrics = this.calculateMetrics(batchData, validationResults);

      // 7. Mark trades as processed (in Phase 1, we just mark them)
      await this.markTradesProcessed(pendingTrades, validationResults);

      console.log('✅ Batch settlement complete:', metrics);

      return metrics;

    } catch (error) {
      console.error('❌ Batch settlement error:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get pending trades that need settlement
   */
  private async getPendingTrades() {
    return await prisma.trade.findMany({
      where: {
        mode: 'real',
        // In Phase 2, we'll add: settledOnChain: false
      },
      include: {
        buyer: true,
        seller: true,
        market: true,
      },
      orderBy: {
        executedAt: 'asc', // FIFO - oldest first
      },
      take: this.batchSize,
    });
  }

  /**
   * Enrich trades with their order details
   */
  private async enrichTradesWithOrders(trades: any[]) {
    const enriched = [];

    for (const trade of trades) {
      // Fetch buy order
      const buyOrder = await prisma.order.findUnique({
        where: { id: trade.buyOrderId },
      });

      // Fetch sell order
      const sellOrder = await prisma.order.findUnique({
        where: { id: trade.sellOrderId },
      });

      if (buyOrder && sellOrder) {
        enriched.push({
          ...trade,
          buyOrder,
          sellOrder,
        });
      } else {
        console.warn(`⚠️  Missing orders for trade ${trade.id}`);
      }
    }

    return enriched;
  }

  /**
   * Group trades by market for more efficient batching
   */
  private groupTradesByMarket(trades: any[]) {
    const grouped = new Map<number, any[]>();
    
    trades.forEach(trade => {
      const marketId = trade.marketId;
      if (!grouped.has(marketId)) {
        grouped.set(marketId, []);
      }
      grouped.get(marketId)!.push(trade);
    });

    return grouped;
  }

  /**
   * Prepare batch data in the format that will be sent to smart contracts
   */
  private async prepareBatchData(tradesByMarket: Map<number, any[]>) {
    const batchOrders = [];

    for (const [marketId, trades] of tradesByMarket) {
      for (const trade of trades) {
        // Extract order data
        const buyOrder = trade.buyOrder;
        const sellOrder = trade.sellOrder;

        // Prepare order structs (format for smart contract)
        batchOrders.push({
          tradeId: trade.id,
          marketId: marketId,
          
          // Buy order data
          buyer: {
            userId: buyOrder.userId,
            signature: buyOrder.signature,
            price: Number(buyOrder.price),
            quantity: Number(trade.quantity),
            nonce: buyOrder.nonce ? buyOrder.nonce.toString() : null,
            expiration: buyOrder.expiration ? Math.floor(buyOrder.expiration.getTime() / 1000) : null,
          },
          
          // Sell order data
          seller: {
            userId: sellOrder.userId,
            signature: sellOrder.signature,
            price: Number(sellOrder.price),
            quantity: Number(trade.quantity),
            nonce: sellOrder.nonce ? sellOrder.nonce.toString() : null,
            expiration: sellOrder.expiration ? Math.floor(sellOrder.expiration.getTime() / 1000) : null,
          },
          
          // Trade data
          executionPrice: Number(trade.price),
          side: trade.side,
          executedAt: trade.executedAt,
        });
      }
    }

    return batchOrders;
  }

  /**
   * Validate all signatures and order data in the batch
   */
  private async validateBatch(batchData: any[]) {
    const results = {
      valid: [] as string[],
      invalid: [] as string[],
      missing: [] as string[],
    };

    for (const order of batchData) {
      // Check if orders have signatures
      if (!order.buyer.signature && !order.seller.signature) {
        // Demo mode trades or pre-signature trades
        results.missing.push(order.tradeId);
        continue;
      }

      // Validate buyer signature (if exists)
      if (order.buyer.signature) {
        const buyerValid = this.isSignatureValid(order.buyer);
        if (!buyerValid) {
          results.invalid.push(order.tradeId);
          continue;
        }
      }

      // Validate seller signature (if exists)
      if (order.seller.signature) {
        const sellerValid = this.isSignatureValid(order.seller);
        if (!sellerValid) {
          results.invalid.push(order.tradeId);
          continue;
        }
      }

      // All validations passed
      results.valid.push(order.tradeId);
    }

    console.log('🔐 Signature validation results:', {
      valid: results.valid.length,
      invalid: results.invalid.length,
      missing: results.missing.length,
    });

    return results;
  }

  /**
   * Check if a signature is valid (placeholder for Phase 1)
   * In Phase 2, this will use actual signature verification
   */
  private isSignatureValid(orderData: any): boolean {
    // Phase 1: Basic checks
    if (!orderData.signature || orderData.signature.length < 130) {
      return false;
    }

    // Check expiration
    if (orderData.expiration) {
      const now = Math.floor(Date.now() / 1000);
      if (now > orderData.expiration) {
        console.warn('⚠️  Order expired:', orderData);
        return false;
      }
    }

    // Phase 2: Add actual signature verification here
    // const isValid = await verifyOrderSignature({ ... });

    return true;
  }

  /**
   * Calculate batch metrics
   */
  private calculateMetrics(batchData: any[], validationResults: any): BatchMetrics {
    const totalVolume = batchData.reduce((sum, order) => {
      return sum + (order.executionPrice * order.buyer.quantity);
    }, 0);

    // Estimate gas costs (placeholder calculation)
    // Each trade ≈ 100,000 gas, Base gas price ≈ 0.001 Gwei
    const estimatedGasPerTrade = 100000;
    const gasEstimate = validationResults.valid.length * estimatedGasPerTrade;

    return {
      tradesProcessed: batchData.length,
      ordersInBatch: validationResults.valid.length,
      totalVolume,
      gasEstimate,
    };
  }

  /**
   * Mark trades as processed
   * In Phase 2, this will include the transaction hash
   */
  private async markTradesProcessed(trades: any[], validationResults: any) {
    // For now, we'll add a log entry
    // In Phase 2, we'll update trades with settlement transaction hash
    
    console.log('📝 Batch settlement summary:', {
      totalTrades: trades.length,
      validSignatures: validationResults.valid.length,
      invalidSignatures: validationResults.invalid.length,
      missingSignatures: validationResults.missing.length,
    });

    // Phase 2: Update database with settlement status
    // await prisma.trade.updateMany({
    //   where: { id: { in: validationResults.valid } },
    //   data: { 
    //     settledOnChain: true,
    //     settlementTxHash: txHash,
    //     settledAt: new Date()
    //   }
    // });
  }

  /**
   * Get current batch queue status
   */
  async getBatchStatus() {
    const pendingCount = await prisma.trade.count({
      where: {
        mode: 'real',
        // settledOnChain: false // Phase 2
      },
    });

    const recentBatches = await this.getRecentBatchHistory();

    return {
      pendingTrades: pendingCount,
      isProcessing: this.isProcessing,
      batchSize: this.batchSize,
      recentBatches,
    };
  }

  /**
   * Get recent batch history (placeholder for Phase 1)
   */
  private async getRecentBatchHistory() {
    // Phase 2: Query actual batch settlement records
    return [];
  }
}

// Singleton instance
export const batchSettler = new BatchSettlementService();

/**
 * Convenience function for API routes
 */
export async function runBatchSettlement() {
  return await batchSettler.processBatch();
}

/**
 * Get current status
 */
export async function getBatchSettlementStatus() {
  return await batchSettler.getBatchStatus();
}