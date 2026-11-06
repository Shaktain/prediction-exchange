// app/api/redemption/redeem/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicClient, createWalletClient, http, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CONTRACTS } from '@/lib/contracts/config';
import ExchangeABI from '@/lib/contracts/PredictExExchange.abi.json';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { marketId } = await request.json();
    
    // Get current user
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`🔄 Redeeming winnings for user ${user.walletAddress}, market ${marketId}`);

    // Verify market is resolved
    const market = await prisma.market.findUnique({
      where: { id: marketId },
    });

    if (!market || !market.resolved) {
      return NextResponse.json(
        { error: 'Market not resolved yet' },
        { status: 400 }
      );
    }

    // Create clients
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    });

    // User needs to sign this themselves, but for testing we'll use server wallet
    // In production, this should be done client-side with user's wallet
    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(),
    });

    // Check user's balance before redemption
    const balanceBefore = await publicClient.readContract({
      address: CONTRACTS.exchange,
      abi: ExchangeABI,
      functionName: 'getBalance',
      args: [user.walletAddress as `0x${string}`],
    });

    // Call redeemWinnings on contract
    const hash = await walletClient.writeContract({
      address: CONTRACTS.exchange,
      abi: ExchangeABI,
      functionName: 'redeemWinnings',
      args: [BigInt(marketId)],
      account: user.walletAddress as `0x${string}`, // User's address
    });

    console.log(`📝 Redemption tx: ${hash}`);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Check balance after
    const balanceAfter = await publicClient.readContract({
      address: CONTRACTS.exchange,
      abi: ExchangeABI,
      functionName: 'getBalance',
      args: [user.walletAddress as `0x${string}`],
    });

    const payout = Number(formatUnits(balanceAfter as bigint, 6)) - Number(formatUnits(balanceBefore as bigint, 6));

    // Update database balance
    await prisma.user.update({
      where: { id: user.id },
      data: {
        usdcBalance: Number(formatUnits(balanceAfter as bigint, 6)),
      },
    });

    // Mark position as redeemed (optional: add 'redeemed' field to Position model)
    // await prisma.position.update({ ... });

    console.log(`✅ Redeemed ${payout} USDC for user ${user.walletAddress}`);

    return NextResponse.json({
      success: true,
      txHash: hash,
      explorerUrl: `https://sepolia.basescan.org/tx/${hash}`,
      payout,
      gasUsed: receipt.gasUsed.toString(),
    });

  } catch (error: any) {
    console.error('Redemption failed:', error);
    
    if (error.message?.includes('No winnings')) {
      return NextResponse.json(
        { error: 'No winnings to redeem for this market' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Redemption failed' },
      { status: 500 }
    );
  }
}

// Helper function - you'll need to implement this based on your auth system
async function getCurrentUser(request: NextRequest) {
  // For now, get user from wallet address in headers/cookies
  // This should integrate with your actual auth system
  const walletAddress = request.headers.get('x-wallet-address');
  
  if (!walletAddress) {
    return null;
  }

  return await prisma.user.findUnique({
    where: { walletAddress },
  });
}