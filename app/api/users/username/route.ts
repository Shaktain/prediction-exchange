// app/api/users/username/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Changed: named import instead of default

// Check if username is available
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { 
          available: false, 
          error: 'Username must be 3-30 characters and contain only letters, numbers, and underscores' 
        },
        { status: 400 }
      );
    }

    // Check if username exists
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    return NextResponse.json({
      available: !existingUser,
      username
    });

  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json(
      { error: 'Failed to check username availability' },
      { status: 500 }
    );
  }
}

// Set username for a user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, username } = body;

    if (!walletAddress || !username) {
      return NextResponse.json(
        { error: 'Wallet address and username are required' },
        { status: 400 }
      );
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-30 characters and contain only letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    // Check if username is taken
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      );
    }

    // Update user with username
    const user = await prisma.user.update({
      where: { walletAddress },
      data: { username }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username
      }
    });

  } catch (error) {
    console.error('Error setting username:', error);
    return NextResponse.json(
      { error: 'Failed to set username' },
      { status: 500 }
    );
  }
}

// Update username (optional - if you want users to change it later)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, newUsername } = body;

    if (!walletAddress || !newUsername) {
      return NextResponse.json(
        { error: 'Wallet address and new username are required' },
        { status: 400 }
      );
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(newUsername)) {
      return NextResponse.json(
        { error: 'Username must be 3-30 characters and contain only letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    // Check if new username is taken
    const existingUsername = await prisma.user.findUnique({
      where: { username: newUsername }
    });

    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      );
    }

    // Update username
    const user = await prisma.user.update({
      where: { walletAddress },
      data: { username: newUsername }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username
      }
    });

  } catch (error) {
    console.error('Error updating username:', error);
    return NextResponse.json(
      { error: 'Failed to update username' },
      { status: 500 }
    );
  }
}