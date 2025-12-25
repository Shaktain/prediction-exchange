// lib/signatures/verifySignature.ts
import { recoverTypedDataAddress } from 'viem';
import { CONTRACTS } from '@/lib/contracts/config';

/**
 * EIP-712 Domain - MUST match frontend exactly!
 */
const domain = {
  name: 'PredictEx',
  version: '1',
  chainId: CONTRACTS.chainId, // Now reads from .env (84532 for testnet)
  verifyingContract: CONTRACTS.exchange,
} as const;

/**
 * EIP-712 Types - Order structure
 * MUST match contract and frontend (uint8 for side/direction)
 */
const types = {
  Order: [
    { name: 'marketId', type: 'uint256' },
    { name: 'side', type: 'uint8' }, // ✅ Changed from 'string'
    { name: 'direction', type: 'uint8' }, // ✅ Changed from 'string'
    { name: 'price', type: 'uint256' },
    { name: 'quantity', type: 'uint256' },
    { name: 'expiration', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

/**
 * Verify an order signature
 */
export async function verifyOrderSignature(order: {
  marketId: number;
  side: string;
  direction: string;
  price: number;
  quantity: number;
  expiration: number;
  nonce: number;
  signature: `0x${string}`;
  userAddress: string;
}): Promise<boolean> {
  try {
    console.log('🔐 Verifying signature...');
    console.log('  Domain:', domain);
    console.log('  Order:', {
      marketId: order.marketId,
      side: order.side,
      direction: order.direction,
      price: order.price,
      quantity: order.quantity,
      expiration: order.expiration,
      nonce: order.nonce,
    });
    console.log('  Expected signer:', order.userAddress);

    // Convert to BigInt and uint8 for EIP-712
    const message = {
      marketId: BigInt(order.marketId),
      side: order.side === 'yes' ? 0 : 1, // ✅ Convert string to uint8
      direction: order.direction === 'buy' ? 0 : 1, // ✅ Convert string to uint8
      price: BigInt(order.price), // Already in wei (from API)
      quantity: BigInt(order.quantity), // Already in wei (from API)
      expiration: BigInt(order.expiration),
      nonce: BigInt(order.nonce),
    };

    // Recover the address that signed this message
    const recoveredAddress = await recoverTypedDataAddress({
      domain,
      types,
      primaryType: 'Order',
      message,
      signature: order.signature,
    });

    console.log('  Recovered address:', recoveredAddress);
    console.log('  Match:', recoveredAddress.toLowerCase() === order.userAddress.toLowerCase());

    // Check if recovered address matches the claimed signer
    return recoveredAddress.toLowerCase() === order.userAddress.toLowerCase();
  } catch (error) {
    console.error('❌ Signature verification failed:', error);
    return false;
  }
}

/**
 * Validate order parameters
 */
export function validateOrderParams(order: {
  marketId: number;
  side: string;
  direction: string;
  price: number;
  quantity: number;
  expiration: number;
  nonce: number;
  signature: string;
  userAddress: string;
}): { valid: boolean; error?: string } {
  // Check required fields
  if (!order.signature || !order.expiration || !order.nonce || !order.userAddress) {
    return { valid: false, error: 'Missing signature fields' };
  }

  // Validate signature format
  if (!order.signature.startsWith('0x') || order.signature.length !== 132) {
    return { valid: false, error: 'Invalid signature format' };
  }

  // Validate address format
  if (!order.userAddress.startsWith('0x') || order.userAddress.length !== 42) {
    return { valid: false, error: 'Invalid user address format' };
  }

  // Validate price (0-1 range)
  if (order.price <= 0 || order.price >= 1) {
    return { valid: false, error: 'Price must be between 0 and 1' };
  }

  // Validate quantity
  if (order.quantity <= 0) {
    return { valid: false, error: 'Quantity must be positive' };
  }

  return { valid: true };
}

/**
 * Check if order has expired
 */
export function isOrderExpired(expiration: number): boolean {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  return now > expiration;
}