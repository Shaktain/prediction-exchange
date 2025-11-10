import { ethers } from 'ethers';

const VAULT_ADDRESS = '0x54fBE04152d4C795bC855e635Af094ac1abdd097';
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

const VAULT_ABI = [
  "function deposit(uint256 amount) external",
  "function withdraw(uint256 amount) external",
  "function getBalance(address user) external view returns (uint256)",
  "function balances(address user) external view returns (uint256)"
];

const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)"
];

export function getProvider() {
  // Add timestamp to prevent caching
  return new ethers.JsonRpcProvider('https://sepolia.base.org');
}

export function getVaultContract(signerOrProvider: any) {
  return new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signerOrProvider);
}

export function getUSDCContract(signerOrProvider: any) {
  return new ethers.Contract(USDC_ADDRESS, USDC_ABI, signerOrProvider);
}

export { VAULT_ADDRESS, USDC_ADDRESS };

/**
 * Get user's balance in the vault contract
 * Waits for latest block to avoid stale data
 */
export async function getOnChainBalance(userAddress: string): Promise<number> {
  try {
    const provider = getProvider();
    
    // Wait for the latest block to ensure we get fresh data
    await provider.getBlockNumber();
    
    const vault = getVaultContract(provider);
    
    // Force latest block
    const balance = await vault.balances(userAddress, { 
      blockTag: 'latest' 
    });
    
    const formattedBalance = Number(ethers.formatUnits(balance, 6));
    
    console.log(`🏦 Vault balance for ${userAddress}: ${formattedBalance} USDC`);
    
    return formattedBalance;
  } catch (error) {
    console.error('Error reading vault balance:', error);
    throw error;
  }
}

/**
 * Get user's USDC balance in their wallet
 */
export async function getUSDCBalance(userAddress: string): Promise<number> {
  try {
    const provider = getProvider();
    await provider.getBlockNumber(); // Ensure latest
    
    const usdc = getUSDCContract(provider);
    const balance = await usdc.balanceOf(userAddress, {
      blockTag: 'latest'
    });
    
    const formattedBalance = Number(ethers.formatUnits(balance, 6));
    
    console.log(`💳 Wallet USDC for ${userAddress}: ${formattedBalance} USDC`);
    
    return formattedBalance;
  } catch (error) {
    console.error('Error reading wallet USDC:', error);
    throw error;
  }
}