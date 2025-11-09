'use client';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';

const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC

const USDC_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function useUSDCBalance() {
  const { address, isConnected } = useAccount();

  const { data: balance, isError, isLoading, refetch } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  const formattedBalance = balance ? Number(formatUnits(balance, 6)) : 0;

  return {
    balance: formattedBalance,
    isLoading,
    isError,
    refetch,
    rawBalance: balance,
  };
}