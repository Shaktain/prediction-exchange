import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { walletAddress }
    });

    // If not, create new user with starting balances
    if (!user) {
      user = await prisma.user.create({
        data: {
          walletAddress,
          demoBalance: 10000, // Demo trading balance
          demoLockedBalance: 0,
          usdcBalance: 0, // Real USDC balance (from deposits)
          realLockedBalance: 0,
          lockedBalance: 0, // Legacy field
          fiatBalance: 0,
          kycStatus: 'pending'
        }
      });
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      balance: Number(user.usdcBalance) - Number(user.lockedBalance),
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        demoBalance: Number(user.demoBalance),
        demoLockedBalance: Number(user.demoLockedBalance),
        usdcBalance: Number(user.usdcBalance),
        realLockedBalance: Number(user.realLockedBalance),
        lockedBalance: Number(user.lockedBalance),
        fiatBalance: Number(user.fiatBalance),
        kycStatus: user.kycStatus
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}