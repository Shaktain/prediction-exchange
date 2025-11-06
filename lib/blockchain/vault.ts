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
  return new ethers.JsonRpcProvider('https://sepolia.base.org');
}

export function getVaultContract(signerOrProvider: any) {
  return new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signerOrProvider);
}

export function getUSDCContract(signerOrProvider: any) {
  return new ethers.Contract(USDC_ADDRESS, USDC_ABI, signerOrProvider);
}

export { VAULT_ADDRESS, USDC_ADDRESS };

// Add to existing vault.ts

export async function getOnChainBalance(userAddress: string): Promise<number> {
  const provider = getProvider();
  const vault = getVaultContract(provider);
  const balance = await vault.balances(userAddress);
  return Number(ethers.formatUnits(balance, 6)); // USDC has 6 decimals
}

export async function getUSDCBalance(userAddress: string): Promise<number> {
  const provider = getProvider();
  const usdc = getUSDCContract(provider);
  const balance = await usdc.balanceOf(userAddress);
  return Number(ethers.formatUnits(balance, 6));
}