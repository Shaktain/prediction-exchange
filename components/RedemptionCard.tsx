// components/RedemptionCard.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { CONTRACTS } from '@/lib/contracts/config';
import ExchangeABI from '@/lib/contracts/PredictExExchange.abi.json';

interface RedeemableMarket {
  marketId: number;
  question: string;
  resolvedOutcome: string;
  sharesHeld: number;
  potentialWinnings: number;
}

export function RedemptionCard() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [redeemableMarkets, setRedeemableMarkets] = useState<RedeemableMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<number | null>(null);

  useEffect(() => {
    if (address) {
      fetchRedeemableMarkets();
    }
  }, [address]);

  async function fetchRedeemableMarkets() {
    if (!address) return;
    
    try {
      const response = await fetch('/api/redemption/redeemable', {
        headers: {
          'x-wallet-address': address,
        },
      });
      const data = await response.json();
      setRedeemableMarkets(data.markets || []);
    } catch (error) {
      console.error('Failed to fetch redeemable markets:', error);
    } finally {
      setLoading(false);
    }
  }

  async function redeemWinnings(marketId: number) {
    if (!address || !walletClient || !publicClient) {
      alert('Please connect your wallet');
      return;
    }

    setRedeeming(marketId);

    try {
      console.log('🔄 Redeeming winnings for market', marketId);

      // Call the smart contract directly from client side
      const hash = await walletClient.writeContract({
        address: CONTRACTS.exchange as `0x${string}`,
        abi: ExchangeABI,
        functionName: 'redeemWinnings',
        args: [BigInt(marketId)],
      });

      console.log('📝 Redemption tx:', hash);

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash 
      });

      console.log('✅ Transaction confirmed:', receipt);

      // Sync the database balance after redemption
      const syncResponse = await fetch('/api/deposits/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({
          walletAddress: address,
        }),
      });

      if (!syncResponse.ok) {
        console.warn('Failed to sync balance, but redemption succeeded');
      }

      const explorerUrl = `https://sepolia.basescan.org/tx/${hash}`;
      alert(`Winnings redeemed successfully!\n\nView on Basescan: ${explorerUrl}`);

      // Refresh the list
      await fetchRedeemableMarkets();

      // Reload page to update balance display
      window.location.reload();

    } catch (error: any) {
      console.error('Redemption error:', error);
      
      if (error.message?.includes('User rejected')) {
        alert('Transaction cancelled');
      } else if (error.message?.includes('No winnings')) {
        alert('No winnings to redeem for this market');
      } else {
        alert(`Failed to redeem: ${error.message}`);
      }
    } finally {
      setRedeeming(null);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">Loading redeemable markets...</div>
      </div>
    );
  }

  if (redeemableMarkets.length === 0) {
    return null; // Don't show anything if no markets to redeem
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-2xl font-bold text-gray-900 mb-4">🎉 Claim Your Winnings</h3>
      
      <div className="space-y-4">
        {redeemableMarkets.map((market) => (
          <div
            key={market.marketId}
            className="p-4 bg-green-50 border border-green-200 rounded-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-base mb-1 text-gray-900">{market.question}</p>
                <p className="text-sm text-gray-600 mb-2">
                  Resolved: <span className="font-semibold text-green-700">{market.resolvedOutcome}</span>
                </p>
                <div className="flex gap-4 text-sm text-gray-700">
                  <span>Shares: {market.sharesHeld}</span>
                  <span className="font-semibold text-green-700">
                    Winnings: ${market.potentialWinnings.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => redeemWinnings(market.marketId)}
                disabled={redeeming === market.marketId}
                className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {redeeming === market.marketId ? 'Redeeming...' : 'Redeem'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
