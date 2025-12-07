import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    const oldBalance = Number(user.usdcBalance);
    console.log(`  Current DB balance: ${oldBalance}`);

    // ✅ Increment balance (not set to absolute value)
    const updatedUser = await prisma.user.update({
      where: { walletAddress },
      data: {
        usdcBalance: { increment: amount }
      }
    });

    const newBalance = Number(updatedUser.usdcBalance);
    console.log(`  ✅ Updated DB balance: ${oldBalance} → ${newBalance}`);

    // Record transaction
    if (txHash) {
      try {
        await prisma.transaction.create({
          data: {
            userId: user.id,
            type: 'deposit',
            amount: amount,
            currency: 'USDC',
            status: 'completed',
            txHash: txHash
          }
        });
        console.log(`  ✅ Transaction recorded`);
      } catch (txError) {
        console.log('  ⚠️  Could not record transaction:', txError);
      }
    }

    return NextResponse.json({
      success: true,
      oldBalance: oldBalance,
      newBalance: newBalance,
      amountAdded: amount,
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