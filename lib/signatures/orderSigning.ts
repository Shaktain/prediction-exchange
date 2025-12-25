// lib/signatures/orderSigning.ts
import { type WalletClient } from 'viem';
import { CONTRACTS } from '@/lib/contracts/config';

// EIP-712 Domain - this identifies your application
const domain = {
  name: 'PredictEx',
  version: '1',
  chainId: CONTRACTS.chainId,
  verifyingContract: CONTRACTS.exchange,
} as const;

// Order Types - MUST match contract exactly (uint8 for side and direction)
const types = {
  Order: [
    { name: 'marketId', type: 'uint256' },
    { name: 'side', type: 'uint8' },
    { name: 'direction', type: 'uint8' },
    { name: 'price', type: 'uint256' },
    { name: 'quantity', type: 'uint256' },
    { name: 'expiration', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

export interface OrderData {
  marketId: number;
  side: 'yes' | 'no';
  direction: 'buy' | 'sell';
  price: number;
  quantity: number;
  expiration?: number; // Unix timestamp, defaults to 24 hours from now
  nonce?: number; // Defaults to Date.now()
}

export interface SignedOrder {
  signature: string;
  expiration: number;
  nonce: number;
}

/**
 * Sign an order using EIP-712
 * This creates a cryptographic signature that proves the user authorized this order
 * Returns the signature along with the expiration and nonce that were used
 */
export async function signOrder(
  walletClient: WalletClient,
  order: OrderData
): Promise<SignedOrder> {
  
  // 🔍 DEBUG: Check which account is being used
  console.log('🔍 SIGNING DEBUG:');
  console.log('  Wallet client account:', walletClient.account?.address);
  console.log('  Wallet client type:', walletClient.account?.type);
  console.log('  Order data:', order);

  // Set defaults
  const expiration = order.expiration || Math.floor(Date.now() / 1000) + 86400; // 24 hours
  const nonce = order.nonce || Date.now();

  // Convert to the format expected by the smart contract
  const message = {
    marketId: BigInt(order.marketId),
    side: order.side === 'yes' ? 0 : 1, // ✅ Convert to uint8 (0 = yes, 1 = no)
    direction: order.direction === 'buy' ? 0 : 1, // ✅ Convert to uint8 (0 = buy, 1 = sell)
    price: BigInt(Math.floor(order.price * 1e6)), // Convert to 6 decimals (USDC standard)
    quantity: BigInt(Math.floor(order.quantity * 1e6)),
    expiration: BigInt(expiration),
    nonce: BigInt(nonce),
  };

  // Debug logging
  console.log('🖊️ FRONTEND SIGNING:', {
    domain,
    types,
    message,
  });

  try {
    const signature = await walletClient.signTypedData({
      account: walletClient.account, // Explicitly pass the account
      domain,
      types,
      primaryType: 'Order',
      message,
    });

    // 🔍 DEBUG: Verify signature was created by correct account
    console.log('✅ SIGNATURE CREATED:');
    console.log('  Signature:', signature);
    console.log('  By account:', walletClient.account?.address);
    
    return {
      signature,
      expiration,
      nonce,
    };
  } catch (error) {
    console.error('❌ Error signing order:', error);
    throw new Error('Failed to sign order. User may have rejected the signature request.');
  }
}

/**
 * Get the hash of an order (useful for cancellations and lookups)
 */
export function getOrderHash(order: OrderData): string {
  const expiration = order.expiration || Math.floor(Date.now() / 1000) + 86400;
  const nonce = order.nonce || Date.now();

  const message = {
    marketId: BigInt(order.marketId),
    side: order.side === 'yes' ? 0 : 1,
    direction: order.direction === 'buy' ? 0 : 1,
    price: BigInt(Math.floor(order.price * 1e6)),
    quantity: BigInt(Math.floor(order.quantity * 1e6)),
    expiration: BigInt(expiration),
    nonce: BigInt(nonce),
  };

  // This would need the actual hash calculation - simplified for now
  return JSON.stringify(message);
}