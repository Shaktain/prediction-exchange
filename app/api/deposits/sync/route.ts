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

    // CRITICAL: Wait 3 seconds for transaction to be mined and propagated
    console.log('  ⏳ Waiting 3 seconds for blockchain confirmation...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get actual vault balance from blockchain
    let vaultBalance;
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        vaultBalance = await getOnChainBalance(walletAddress);
        console.log(`  📊 Vault balance (attempt ${retries + 1}): ${vaultBalance}`);
        
        // Verify it makes sense (should be >= old balance)
        if (vaultBalance >= Number(user.usdcBalance)) {
          break; // Success!
        } else {
          console.log(`  ⚠️  Balance seems stale, retrying...`);
          retries++;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`  Error reading vault balance (attempt ${retries + 1}):`, error);
        retries++;
        if (retries >= maxRetries) {
          // Fallback: just add the amount
          vaultBalance = Number(user.usdcBalance) + amount;
          console.log(`  Using fallback calculation: ${vaultBalance}`);
        } else {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // Update user's USDC balance to match vault
    const updatedUser = await prisma.user.update({
      where: { walletAddress },
      data: {
        usdcBalance: vaultBalance
      }
    });

    console.log(`  ✅ Updated DB balance: ${user.usdcBalance} → ${updatedUser.usdcBalance}`);

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
      oldBalance: Number(user.usdcBalance),
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