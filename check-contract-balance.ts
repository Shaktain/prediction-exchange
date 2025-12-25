import { createPublicClient, http, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';

const client = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

const ExchangeABI = [{
  "inputs": [{"name": "user", "type": "address"}],
  "name": "getBalance",
  "outputs": [{"name": "", "type": "uint256"}],
  "stateMutability": "view",
  "type": "function"
}];

async function check() {
  const balance = await client.readContract({
    address: '0xD92E9A787b825D0Dde9968782F7b129539263668' as `0x${string}`,
    abi: ExchangeABI,
    functionName: 'getBalance',
    args: ['0x6cfC6D4b0fEa11D74732532c82AfE0611eA0D0E1' as `0x${string}`]
  });
  
  console.log('Contract Balance (raw):', balance.toString());
  console.log('Contract Balance (USDC):', formatUnits(balance as bigint, 6));
}

check().catch(console.error);
