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

    console.log(`💰 Syncing deposit: ${amount} USDC for ${walletAddress}`);

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress }
    });

    if (!user) {
      console.log('  Creating new user...');
      user = await prisma.user.create({
        data: {
          walletAddress,
          demoBalance: 10000,
          demoLockedBalance: 0,
          usdcBalance: 0,
          realLockedBalance: 0
        }
      });
    }

    console.log(`  Current DB balance: ${user.usdcBalance}`);

    // Get actual vault balance from blockchain
    let vaultBalance;
    try {
      vaultBalance = await getOnChainBalance(walletAddress);
      console.log(`  Vault balance from blockchain: ${vaultBalance}`);
    } catch (error) {
      console.error('  Error reading vault balance:', error);
      // If can't read from blockchain, just add the amount to current balance
      vaultBalance = Number(user.usdcBalance) + amount;
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

    // Record transaction if Transaction model exists
    if (txHash) {
      try {
        await prisma.transaction.create({
          data: {
            userId: user.id,
            type: 'deposit',
            amount: amount,
            currency: 'USDC', // Add required currency field
            status: 'completed',
            txHash: txHash
          }
        });
        console.log(`  ✅ Transaction recorded`);
      } catch (txError) {
        console.log('  ⚠️ Could not record transaction:', txError);
        // Continue anyway - the balance update is what matters
      }
    }

    return NextResponse.json({
      success: true,
      newBalance: Number(updatedUser.usdcBalance),
      vaultBalance: vaultBalance,
      message: 'Deposit synced successfully'
    });

  } catch (error: any) {
    console.error('❌ Error syncing deposit:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync deposit' },
      { status: 500 }
    );
  }
}