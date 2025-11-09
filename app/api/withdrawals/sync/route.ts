import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOnChainBalance } from '@/lib/blockchain/vault';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, amount, txHash } = body;

    if (!walletAddress || !amount) {
      return NextResponse.json(
        { error: 'walletAddress and amount required' },
        { status: 400 }
      );
    }

    console.log(`💸 Syncing withdrawal: ${amount} USDC for ${walletAddress}`);

    // Get user
    const user = await prisma.user.findUnique({
      where: { walletAddress }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log(`  Current DB balance: ${user.usdcBalance}`);

    // Get actual vault balance from blockchain
    let vaultBalance;
    try {
      vaultBalance = await getOnChainBalance(walletAddress);
      console.log(`  Vault balance from blockchain: ${vaultBalance}`);
    } catch (error) {
      console.error('  Error reading vault balance:', error);
      // If can't read from blockchain, subtract the amount from current balance
      vaultBalance = Number(user.usdcBalance) - amount;
      console.log(`  Using fallback: ${vaultBalance}`);
    }

    // Update user's USDC balance to match vault
    const updatedUser = await prisma.user.update({
      where: { walletAddress },
      data: {
        usdcBalance: vaultBalance
      }
    });

    console.log(`  ✅ Updated DB balance to: ${updatedUser.usdcBalance}`);

    // Record transaction
    if (txHash) {
      try {
        await prisma.transaction.create({
          data: {
            userId: user.id,
            type: 'withdrawal',
            amount: amount,
            currency: 'USDC',
            status: 'completed',
            txHash: txHash
          }
        });
        console.log(`  ✅ Transaction recorded`);
      } catch (txError) {
        console.log('  ⚠️ Could not record transaction:', txError);
      }
    }

    return NextResponse.json({
      success: true,
      newBalance: Number(updatedUser.usdcBalance),
      vaultBalance: vaultBalance,
      message: 'Withdrawal synced successfully'
    });

  } catch (error: any) {
    console.error('❌ Error syncing withdrawal:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync withdrawal' },
      { status: 500 }
    );
  }
}