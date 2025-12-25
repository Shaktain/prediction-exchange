// scripts/check-balance.ts
import { createPublicClient, http, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import ExchangeABI from '../lib/contracts/PredictExExchange.abi.json';
import { CONTRACTS } from '../lib/contracts/config';

const wallet1 = '0x6cfC6D4b0fEa11D74732532c82AfE0611eA0D0E1';
const wallet2 = '0x406553DEaD8CcA076573e5A28b3301cFdb79156a';

async function checkBalances() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org'),
  });

  console.log('🔍 Checking Exchange Contract Balances...\n');
  console.log('Exchange Contract:', CONTRACTS.exchange);
  console.log('');

  // Check Wallet 1
  try {
    const balance1Raw = await publicClient.readContract({
      address: CONTRACTS.exchange,
      abi: ExchangeABI,
      functionName: 'getBalance',
      args: [wallet1 as `0x${string}`],
    });
    const balance1 = formatUnits(balance1Raw as bigint, 6);
    console.log('💰 Wallet 1 (Buyer):', wallet1);
    console.log('   Balance:', balance1, 'USDC');
    console.log('   Raw:', balance1Raw.toString());
    console.log('');
  } catch (error) {
    console.error('❌ Error reading Wallet 1 balance:', error);
  }

  // Check Wallet 2
  try {
    const balance2Raw = await publicClient.readContract({
      address: CONTRACTS.exchange,
      abi: ExchangeABI,
      functionName: 'getBalance',
      args: [wallet2 as `0x${string}`],
    });
    const balance2 = formatUnits(balance2Raw as bigint, 6);
    console.log('💰 Wallet 2 (Seller):', wallet2);
    console.log('   Balance:', balance2, 'USDC');
    console.log('   Raw:', balance2Raw.toString());
    console.log('');
  } catch (error) {
    console.error('❌ Error reading Wallet 2 balance:', error);
  }

  console.log('✅ Balance check complete');
}

checkBalances().catch(console.error);
