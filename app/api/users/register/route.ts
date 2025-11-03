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

    // If not, create new user with starting balance
    if (!user) {
      user = await prisma.user.create({
        data: {
          walletAddress,
          usdcBalance: 10000, // Give new users $10,000 demo money
          lockedBalance: 0,
          fiatBalance: 0,
          kycStatus: 'pending'
        }
      });
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      balance: Number(user.usdcBalance)
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}