'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

interface Market {
  id: number;
  title: string;
  description: string;
  category: string;
  endDate: string;
  resolved: boolean;
  outcome: boolean | null;
  totalVolume: number;
  traderCount: number;
}

export default function MarketResolutionPage() {
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<number | null>(null);

  useEffect(() => {
    fetchMarkets();
  }, []);

  async function fetchMarkets() {
    try {
      const response = await fetch('/api/markets');
      const data = await response.json();
      // Only show unresolved markets
      setMarkets(data.markets.filter((m: Market) => !m.resolved));
    } catch (error) {
      console.error('Error fetching markets:', error);
    } finally {
      setLoading(false);
    }
  }

  async function resolveMarket(marketId: number, outcome: boolean) {
    setResolving(marketId);
    
    try {
      const response = await fetch(`/api/markets/${marketId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome })
      });

      if (!response.ok) {
        throw new Error('Failed to resolve market');
      }

      // Refresh markets list
      await fetchMarkets();
    } catch (error) {
      console.error('Error resolving market:', error);
      alert('Failed to resolve market');
    } finally {
      setResolving(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Admin
        </button>

        <h1 className="text-4xl font-bold text-gray-900 mb-8">Resolve Markets</h1>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : markets.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">All Caught Up!</h2>
            <p className="text-gray-600">There are no markets pending resolution.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {markets.map((market) => (
              <div key={market.id} className="bg-white rounded-xl shadow-lg p-6">
                <div className="mb-4">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                    {market.category}
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {market.title}
                </h2>

                <p className="text-gray-600 mb-4">
                  {market.description}
                </p>

                <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-500 mb-1">End Date</div>
                    <div className="font-semibold text-gray-900">
                      {new Date(market.endDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-500 mb-1">Volume</div>
                    <div className="font-semibold text-gray-900">
                      ${(Number(market.totalVolume) / 1000).toFixed(1)}K
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-500 mb-1">Traders</div>
                    <div className="font-semibold text-gray-900">
                      {market.traderCount}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => resolveMarket(market.id, true)}
                    disabled={resolving === market.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-lg transition"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {resolving === market.id ? 'Resolving...' : 'Resolve YES'}
                  </button>
                  <button
                    onClick={() => resolveMarket(market.id, false)}
                    disabled={resolving === market.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-3 px-6 rounded-lg transition"
                  >
                    <XCircle className="w-5 h-5" />
                    {resolving === market.id ? 'Resolving...' : 'Resolve NO'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}