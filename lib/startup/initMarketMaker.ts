// lib/startup/initMarketMaker.ts

import { startMarketMaker } from '@/lib/services/marketMakerService';

let initialized = false;

/**
 * Initialize market maker on server startup
 * Call this once when the Next.js app starts
 */
export function initializeMarketMaker() {
  if (initialized) {
    console.log('⚠️  Market maker already initialized');
    return;
  }

  // Only run in production or when explicitly enabled
  const shouldRun = 
    process.env.NODE_ENV === 'production' || 
    process.env.ENABLE_MARKET_MAKER === 'true';

  if (!shouldRun) {
    console.log('ℹ️  Market maker disabled in development (set ENABLE_MARKET_MAKER=true to enable)');
    return;
  }

  console.log('🚀 Initializing market maker...');
  
  // Start with 15 second interval (configurable via env)
  const interval = parseInt(process.env.MARKET_MAKER_INTERVAL || '15');
  
  startMarketMaker(interval);
  initialized = true;
}

// Auto-initialize on module load in production
if (typeof window === 'undefined') {
  // Only run on server side
  initializeMarketMaker();
}