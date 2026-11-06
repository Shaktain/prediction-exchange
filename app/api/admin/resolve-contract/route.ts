// app/api/admin/resolve-contract/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, createPublicClient } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CONTRACTS } from '@/lib/contracts/config';
import ExchangeABI from '@/lib/contracts/PredictExExchange.abi.json';

export async function POST(request: NextRequest) {
  try {
    const { marketId, outcome } = await request.json();

    if (!marketId || typeof outcome !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing marketId or outcome (must be boolean)' },
        { status: 400 }
      );
    }

    console.log(`🔄 Resolving market ${marketId} on-chain: ${outcome ? 'YES' : 'NO'}`);

    // Create wallet client
    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(),
    });

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    });

    // Check if market already resolved on-chain
    // (Optional: add this check to your contract and read it here)

    // Call resolveMarket on contract
    const hash = await walletClient.writeContract({
      address: CONTRACTS.exchange,
      abi: ExchangeABI,
      functionName: 'resolveMarket',
      args: [BigInt(marketId), outcome],
    });

    console.log(`📝 Transaction hash: ${hash}`);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log(`✅ Market ${marketId} resolved on-chain`);

    return NextResponse.json({
      success: true,
      txHash: hash,
      explorerUrl: `https://sepolia.basescan.org/tx/${hash}`,
      gasUsed: receipt.gasUsed.toString(),
    });

  } catch (error: any) {
    console.error('Failed to resolve on-chain:', error);
    
    // Check if it's an "already resolved" error
    if (error.message?.includes('already resolved')) {
      return NextResponse.json(
        { error: 'Market already resolved on-chain' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to resolve on-chain' },
      { status: 500 }
    );
  }
}