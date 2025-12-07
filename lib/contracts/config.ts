// lib/contracts/config.ts

/**
 * Smart Contract Configuration
 * 
 * Contract addresses and network settings for PredictEx
 */

export const CONTRACTS = {
  // Contract addresses (from deployment)
  conditionalTokens: process.env.NEXT_PUBLIC_CONDITIONAL_TOKENS_ADDRESS as `0x${string}`,
  exchange: process.env.NEXT_PUBLIC_EXCHANGE_CONTRACT_ADDRESS as `0x${string}`,
  usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`,
  
  // Network
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532'),
} as const;

// Validate addresses are set
if (!CONTRACTS.conditionalTokens || CONTRACTS.conditionalTokens === '0x') {
  console.warn('⚠️  NEXT_PUBLIC_CONDITIONAL_TOKENS_ADDRESS not set in .env.local');
}

if (!CONTRACTS.exchange || CONTRACTS.exchange === '0x') {
  console.warn('⚠️  NEXT_PUBLIC_EXCHANGE_CONTRACT_ADDRESS not set in .env.local');
}

// Network configuration
export const NETWORK_CONFIG = {
  chainId: 84532, // Base Sepolia
  name: 'Base Sepolia',
  rpcUrl: 'https://sepolia.base.org',
  blockExplorer: 'https://sepolia.basescan.org',
} as const;

// For mainnet (later)
export const MAINNET_CONTRACTS = {
  chainId: 8453, // Base Mainnet
  usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
  // Add after mainnet deployment:
  // conditionalTokens: '0x...',
  // exchange: '0x...',
} as const;