// lib/services/batchSettlementBlockchain.ts
import { prisma } from '@/lib/prisma';
import { createPublicClient, createWalletClient, http, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CONTRACTS } from '@/lib/contracts/config';

// Import ABIs (we'll create these next)
import ExchangeABI from '@/lib/contracts/PredictExExchange.abi.json';

interface BatchMetrics {
  tradesProcessed: number;
  ordersInBatch: number;
  totalVolume: number;
  gasUsed: bigint;
  txHash: string;
}

/**
 * Blockchain Batch Settlement Service
 * 
 * Submits matched trades to smart contracts on Base
 */
export class BlockchainBatchSettler {
  private isProcessing = false;
  private batchSize = 100;
  
  // Blockchain clients
  private publicClient;
  private walletClient;
  
  constructor() {
    // Public client for reading
    this.publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    });
    
    // Wallet client for transactions
    const account = privateKeyToAccount(
      process.env.PRIVATE_KEY as `0x${string}`
    );
    
    this.walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(),
    });
  }
  
  /**
   * Process batch and submit to blockchain
   */
  async processBatch(): Promise<BatchMetrics> {
    if (this.isProcessing) {
      throw new Error('Batch already processing');
    }

    this.isProcessing = true;
    console.log('🔄 Starting blockchain batch settlement...');

    try {
      // 1. Get pending trades
      const pendingTrades = await this.getPendingTrades();
      
      if (pendingTrades.length === 0) {
        console.log('✅ No pending trades');
        return {
          tradesProcessed: 0,
          ordersInBatch: 0,
          totalVolume: 0,
          gasUsed: BigInt(0),
          txHash: '',
        };
      }

      console.log(`📊 Found ${pendingTrades.length} pending trades`);

      // 2. Get order details
      const tradesWithOrders = await this.enrichTradesWithOrders(pendingTrades);

      // 3. Prepare batch data for smart contract
      const batchData = this.prepareBatchForContract(tradesWithOrders);

      // 4. Submit to blockchain
      const txHash = await this.submitToBlockchain(batchData);

      // 5. Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ 
        hash: txHash as `0x${string}` 
      });

      // 6. Mark trades as settled
      await this.markTradesSettled(pendingTrades, txHash);

      // 7. ✅ NEW: Sync database balances from contract
      await this.syncBalancesAfterSettlement(tradesWithOrders);

      const metrics = {
        tradesProcessed: pendingTrades.length,
        ordersInBatch: batchData.buyOrders.length,
        totalVolume: this.calculateVolume(tradesWithOrders),
        gasUsed: receipt.gasUsed,
        txHash,
      };

      console.log('✅ Batch settled on-chain:', metrics);
      console.log('🔍 ABOUT TO RETURN:', metrics); // ADD THIS
      return metrics;

    } catch (error) {
      console.error('❌ Blockchain settlement error:', error);
      throw error;
    } finally {
      console.log('🔍 FINALLY BLOCK - isProcessing:', this.isProcessing); // ADD THIS
      this.isProcessing = false;
      console.log('🔍 FINALLY BLOCK DONE'); // ADD THIS
    }
  }

  /**
   * Get pending trades from database
   */
  private async getPendingTrades() {
    return await prisma.trade.findMany({
      where: {
        mode: 'real',
        // Add this field to schema later: settledOnChain: false
      },
      include: {
        buyer: true,
        seller: true,
        market: true,
      },
      orderBy: {
        executedAt: 'asc',
      },
      take: this.batchSize,
    });
  }

  /**
   * Enrich trades with order details
   */
  private async enrichTradesWithOrders(trades: any[]) {
    const enriched = [];

    for (const trade of trades) {
      const buyOrder = await prisma.order.findUnique({
        where: { id: trade.buyOrderId },
      });

      const sellOrder = await prisma.order.findUnique({
        where: { id: trade.sellOrderId },
      });

      if (buyOrder && sellOrder && buyOrder.signature && sellOrder.signature) {
        enriched.push({
          ...trade,
          buyOrder,
          sellOrder,
        });
      } else {
        console.warn(`⚠️  Trade ${trade.id} missing signatures, skipping`);
      }
    }

    return enriched;
  }

  /**
   * Prepare batch data in smart contract format
   */
  private prepareBatchForContract(trades: any[]) {
    const buyOrders = [];
    const sellOrders = [];
    const buySignatures = [];
    const sellSignatures = [];
    const quantities = [];

    for (const trade of trades) {
      // Buy order struct
      buyOrders.push({
        marketId: BigInt(trade.buyOrder.marketId),
        side: trade.buyOrder.side === 'yes' ? 0 : 1,
        direction: 0, // buy
        price: BigInt(Math.floor(Number(trade.buyOrder.price) * 1e6)),
        quantity: BigInt(Math.floor(Number(trade.quantity) * 1e6)),
        expiration: BigInt(Math.floor(trade.buyOrder.expiration.getTime() / 1000)),
        nonce: trade.buyOrder.nonce,
      });

      // Sell order struct
      sellOrders.push({
        marketId: BigInt(trade.sellOrder.marketId),
        side: trade.sellOrder.side === 'yes' ? 0 : 1,
        direction: 1, // sell
        price: BigInt(Math.floor(Number(trade.sellOrder.price) * 1e6)),
        quantity: BigInt(Math.floor(Number(trade.quantity) * 1e6)),
        expiration: BigInt(Math.floor(trade.sellOrder.expiration.getTime() / 1000)),
        nonce: trade.sellOrder.nonce,
      });

      buySignatures.push(trade.buyOrder.signature as `0x${string}`);
      sellSignatures.push(trade.sellOrder.signature as `0x${string}`);
      quantities.push(BigInt(Math.floor(Number(trade.quantity) * 1e6)));
    }

    return {
      buyOrders,
      sellOrders,
      buySignatures,
      sellSignatures,
      quantities,
    };
  }

  /**
   * Submit batch to blockchain
   */
  private async submitToBlockchain(batchData: any): Promise<string> {
    console.log('📤 Submitting batch to blockchain...');

    const hash = await this.walletClient.writeContract({
      address: CONTRACTS.exchange,
      abi: ExchangeABI,
      functionName: 'settleBatch',
      args: [
        batchData.buyOrders,
        batchData.sellOrders,
        batchData.buySignatures,
        batchData.sellSignatures,
        batchData.quantities,
      ],
    });

    console.log(`📝 Transaction hash: ${hash}`);
    return hash;
  }

  /**
   * Mark trades as settled in database
   */
  private async markTradesSettled(trades: any[], txHash: string) {
    const tradeIds = trades.map(t => t.id);

    // For now, just log
    // Later, add settledOnChain and settlementTxHash fields to Trade model
    console.log(`✅ Would mark ${tradeIds.length} trades as settled with tx: ${txHash}`);
    
    // TODO: Uncomment after adding fields to schema
    // await prisma.trade.updateMany({
    //   where: { id: { in: tradeIds } },
    //   data: {
    //     settledOnChain: true,
    //     settlementTxHash: txHash,
    //     settledAt: new Date(),
    //   },
    // });
  }

  /**
   * ✅ NEW: Sync database balances from contract after settlement
   */
  private async syncBalancesAfterSettlement(trades: any[]) {
    console.log('🔄 Syncing database balances from contract...');

    // Get unique users involved in trades
    const userIds = new Set<string>();
    trades.forEach(trade => {
      userIds.add(trade.buyerUserId);
      userIds.add(trade.sellerUserId);
    });

    console.log(`  📊 Syncing ${userIds.size} users`);

    // Sync each user's balance
    for (const userId of userIds) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { 
            walletAddress: true, 
            usdcBalance: true,
            realLockedBalance: true 
          }
        });

        if (!user) {
          console.warn(`  ⚠️  User ${userId} not found, skipping`);
          continue;
        }

        // Read actual balance from contract
        const contractBalanceRaw = await this.publicClient.readContract({
          address: CONTRACTS.exchange,
          abi: ExchangeABI,
          functionName: 'getBalance',
          args: [user.walletAddress as `0x${string}`],
        });

        const contractBalance = Number(formatUnits(contractBalanceRaw as bigint, 6));
        const oldBalance = Number(user.usdcBalance);
        const lockedBalance = Number(user.realLockedBalance);

        console.log(`  💰 ${user.walletAddress.slice(0, 8)}...`);
        console.log(`     DB: ${oldBalance} (${lockedBalance} locked)`);
        console.log(`     Contract: ${contractBalance}`);

        // Calculate how much was used in trades
        const amountUsed = oldBalance - contractBalance;

        // Update database
        await prisma.user.update({
          where: { id: userId },
          data: {
            usdcBalance: contractBalance,
            realLockedBalance: Math.max(0, lockedBalance - amountUsed), // Unlock funds used in trades
          }
        });

        console.log(`     ✅ Updated: ${contractBalance} (unlocked ${Math.min(lockedBalance, amountUsed)})`);

      } catch (error) {
        console.error(`  ❌ Error syncing user ${userId}:`, error);
        // Continue with other users even if one fails
      }
    }

    console.log('✅ Balance sync complete');
  }

  /**
   * Calculate total volume
   */
  private calculateVolume(trades: any[]): number {
    return trades.reduce((sum, trade) => {
      return sum + (Number(trade.price) * Number(trade.quantity));
    }, 0);
  }

  /**
   * Get batch status
   */
  async getStatus() {
    const pendingCount = await prisma.trade.count({
      where: {
        mode: 'real',
        // settledOnChain: false
      },
    });

    return {
      pendingTrades: pendingCount,
      isProcessing: this.isProcessing,
      batchSize: this.batchSize,
      contractAddress: CONTRACTS.exchange,
    };
  }
}

// Singleton instance
export const blockchainBatchSettler = new BlockchainBatchSettler();

/**
 * Run batch settlement
 */
export async function runBlockchainBatchSettlement() {
  return await blockchainBatchSettler.processBatch();
}

/**
 * Get settlement status
 */
export async function getBlockchainBatchSettlementStatus() {
  return await blockchainBatchSettler.getStatus();
}