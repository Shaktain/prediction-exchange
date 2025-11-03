'use client';
import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { calculatePotentialReturn } from '@/lib/utils/market-helpers';

export function useTrade(marketId: number, yesPrice: number, noPrice: number) {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [side, setSide] = useState<'yes' | 'no'>('yes');
  const [isTrading, setIsTrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const potentialReturn = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) {
      return { shares: 0, potentialReturn: 0, potentialProfit: 0 };
    }
    const price = side === 'yes' ? yesPrice : noPrice;
    return calculatePotentialReturn(parseFloat(amount), price);
  }, [amount, side, yesPrice, noPrice]);

  const executeTrade = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsTrading(true);
    setError(null);

    try {
      // First, ensure user exists in database
      const userResponse = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });

      if (!userResponse.ok) {
        throw new Error('Failed to register user');
      }

      const { userId } = await userResponse.json();

      // Create order
      const price = side === 'yes' ? yesPrice : noPrice;
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          marketId,
          side,
          type: 'market',
          price,
          quantity: parseFloat(amount)
        })
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || 'Failed to place order');
      }

      const orderData = await orderResponse.json();
      
      // Reset form on success
      setAmount('');
      
      return orderData;
    } catch (err: any) {
      console.error('Trade error:', err);
      setError(err.message || 'Failed to execute trade');
      throw err;
    } finally {
      setIsTrading(false);
    }
  };

  return {
    amount,
    setAmount,
    side,
    setSide,
    isTrading,
    error,
    executeTrade,
    isConnected,
    potentialReturn
  };
}