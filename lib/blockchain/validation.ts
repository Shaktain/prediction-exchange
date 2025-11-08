import { prisma } from '@/lib/prisma';
import { getOnChainBalance } from './vault';
import { VAULT_ADDRESS } from './vault';

export async function validateVaultBalance() {
  try {
    // Get total USDC in vault
    const vaultBalance = await getOnChainBalance(VAULT_ADDRESS);
    
    // Get total user balances from database
    const users = await prisma.user.findMany({
      select: {
        usdcBalance: true,
        lockedBalance: true
      }
    });
    
    const totalAvailable = users.reduce((sum, user) => 
      sum + Number(user.usdcBalance), 0
    );
    
    const totalLocked = users.reduce((sum, user) => 
      sum + Number(user.lockedBalance), 0
    );
    
    const totalClaims = totalAvailable + totalLocked;
    
    console.log('Vault Balance:', vaultBalance);
    console.log('Total Available:', totalAvailable);
    console.log('Total Locked:', totalLocked);
    console.log('Total Claims:', totalClaims);
    
    // Vault should have at least total claims
    if (totalClaims > vaultBalance + 0.01) { // 0.01 tolerance for rounding
      throw new Error(
        `Vault underfunded! Claims: ${totalClaims}, Vault: ${vaultBalance}`
      );
    }
    
    return {
      valid: true,
      vaultBalance,
      totalClaims,
      surplus: vaultBalance - totalClaims
    };
    
  } catch (error) {
    console.error('Vault validation error:', error);
    throw error;
  }
}

export async function validateWithdrawal(userId: string, amount: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        usdcBalance: true,
        lockedBalance: true
      }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const availableBalance = Number(user.usdcBalance) - Number(user.lockedBalance);
    
    if (amount > availableBalance) {
      throw new Error(
        `Insufficient available balance. Available: ${availableBalance}, Requested: ${amount}`
      );
    }
    
    // Check vault has enough
    const vaultBalance = await getOnChainBalance(VAULT_ADDRESS);
    if (amount > vaultBalance) {
      throw new Error(
        `Vault has insufficient funds. Available: ${vaultBalance}, Requested: ${amount}`
      );
    }
    
    return {
      valid: true,
      availableBalance,
      vaultBalance
    };
    
  } catch (error) {
    console.error('Withdrawal validation error:', error);
    throw error;
  }
}

export async function getSystemHealth() {
  try {
    const validation = await validateVaultBalance();
    
    const totalUsers = await prisma.user.count();
    const totalMarkets = await prisma.market.count();
    const totalTrades = await prisma.trade.count();
    
    return {
      healthy: validation.valid,
      vaultBalance: validation.vaultBalance,
      totalClaims: validation.totalClaims,
      surplus: validation.surplus,
      totalUsers,
      totalMarkets,
      totalTrades
    };
    
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}