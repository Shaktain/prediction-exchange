import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST - Sync withdrawal from blockchain to database
 * Called after a successful withdrawal transaction
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, amount, txHash } = body;

    if (!walletAddress || !amount || !txHash) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress, amount, txHash' },
        { status: 400 }
      );
    }

    console.log('💸 Syncing withdrawal to database:', {
      walletAddress,
      amount,
      txHash,
    });

    // Get user
    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user's USDC balance
    await prisma.user.update({
      where: { walletAddress },
      data: {
        usdcBalance: { decrement: amount },
      },
    });

    console.log(`✅ Deducted ${amount} USDC from ${walletAddress}`);

    // Optionally: Record the withdrawal transaction
    // await prisma.transaction.create({
    //   data: {
    //     userId: user.id,
    //     type: 'withdrawal',
    //     amount,
    //     txHash,
    //     status: 'confirmed',
    //   },
    // });

    return NextResponse.json({
      success: true,
      message: 'Withdrawal synced successfully',
      newBalance: Number(user.usdcBalance) - amount,
    });
  } catch (error) {
    console.error('❌ Error syncing withdrawal:', error);
    return NextResponse.json(
      { error: 'Failed to sync withdrawal' },
      { status: 500 }
    );
  }
}