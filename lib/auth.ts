// lib/auth.ts
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function getCurrentUser(request: NextRequest) {
  // Get wallet address from cookie or header
  // For now, we'll use a simple header-based approach
  const walletAddress = request.headers.get('x-wallet-address');
  
  if (!walletAddress) {
    return null;
  }

  return await prisma.user.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
  });
}

// Middleware to add wallet address to request headers
export async function getUserFromWallet(walletAddress: string) {
  if (!walletAddress) return null;
  
  return await prisma.user.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
  });
}