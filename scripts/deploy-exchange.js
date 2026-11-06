// scripts/deploy-exchange.js
const hre = require("hardhat");

async function main() {
  console.log('🚀 Deploying PredictExExchange...');

  // Contract addresses from your .env.local
  const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS;
  const CONDITIONAL_TOKENS_ADDRESS = process.env.NEXT_PUBLIC_CONDITIONAL_TOKENS_ADDRESS;

  if (!USDC_ADDRESS || !CONDITIONAL_TOKENS_ADDRESS) {
    throw new Error('Missing contract addresses in .env.local');
  }

  console.log('📍 Using addresses:');
  console.log('  USDC:', USDC_ADDRESS);
  console.log('  ConditionalTokens:', CONDITIONAL_TOKENS_ADDRESS);

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log('👤 Deploying with account:', deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('💰 Account balance:', hre.ethers.formatEther(balance), 'ETH');

  // Deploy PredictExExchange
  const PredictExExchange = await hre.ethers.getContractFactory('PredictExExchange');
  const exchange = await PredictExExchange.deploy(
    USDC_ADDRESS,
    CONDITIONAL_TOKENS_ADDRESS
  );

  await exchange.waitForDeployment();
  const exchangeAddress = await exchange.getAddress();

  console.log('✅ PredictExExchange deployed to:', exchangeAddress);
  console.log('');
  console.log('📋 Update your .env.local:');
  console.log(`NEXT_PUBLIC_EXCHANGE_CONTRACT_ADDRESS=${exchangeAddress}`);
  console.log('');
  console.log('🔗 View on Basescan:');
  console.log(`https://sepolia.basescan.org/address/${exchangeAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });