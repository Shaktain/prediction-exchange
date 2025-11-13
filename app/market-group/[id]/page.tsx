'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import Header from '@/components/Header';
import Comments from '@/components/Comments';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { useTradingMode } from '@/lib/contexts/TradingModeContext';

interface MarketOption {
  id: number;
  optionText: string;
  yesPrice: number;
  noPrice: number;
  totalVolume: number;
  resolved: boolean;
  outcome: boolean | null;
}

interface MarketGroup {
  id: number;
  question: string;
  description: string;
  category: string;
  thumbnail: string;
  options: MarketOption[];
}

export default function MarketGroupPage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useAccount();
  const { mode } = useTradingMode();
  const [marketGroup, setMarketGroup] = useState<MarketGroup | null>(null);
  const [priceChanges, setPriceChanges] = useState<{ [key: number]: number }>({});
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Get userId when wallet connects
  useEffect(() => {
    async function fetchUserId() {
      if (!address) {
        setUserId(null);
        return;
      }

      try {
        const response = await fetch('/api/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: address })
        });
        const data = await response.json();
        setUserId(data.userId);
      } catch (error) {
        console.error('Error fetching user ID:', error);
      }
    }

    fetchUserId();
  }, [address]);

  useEffect(() => {
    async function fetchMarketGroup() {
      try {
        const response = await fetch(`/api/market-groups/${params.id}`);
        if (!response.ok) {
          throw new Error('Market group not found');
        }
        const data = await response.json();
        setMarketGroup(data.marketGroup);

        // Fetch price changes
        const priceChangeResponse = await fetch(`/api/market-groups/${params.id}/price-changes`);
        if (priceChangeResponse.ok) {
          const priceChangeData = await priceChangeResponse.json();
          setPriceChanges(priceChangeData.priceChanges || {});
        }
      } catch (error) {
        console.error('Error fetching market group:', error);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchMarketGroup();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!marketGroup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Market Group Not Found</h2>
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-700"
            >
              Return to Markets
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Sort options by probability
  const sortedOptions = [...marketGroup.options].sort((a, b) => b.yesPrice - a.yesPrice);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push('/')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Markets
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="flex items-start gap-4 mb-6">
            {marketGroup.thumbnail && (
              <span className="text-4xl">{marketGroup.thumbnail}</span>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
                  {marketGroup.category}
                </span>
                <span className="text-sm text-gray-500">
                  {marketGroup.options.length} options
                </span>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {marketGroup.question}
              </h1>
              <p className="text-gray-600 text-lg">
                {marketGroup.description}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-8">
          {sortedOptions.map((option, index) => {
            const probability = Math.round(option.yesPrice * 100);
            const priceChange = priceChanges[option.id] || 0;
            const isPositive = priceChange > 0;
            const isNegative = priceChange < 0;
            
            return (
              <div
                key={option.id}
                onClick={() => router.push(`/market/${option.id}?mode=${mode}`)}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  {/* Left: Option Name */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {option.optionText}
                    </h3>
                  </div>

                  {/* Center: Probability and Change */}
                  <div className="flex items-center gap-3 mx-6">
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        probability >= 70 ? 'text-green-600' :
                        probability >= 40 ? 'text-gray-900' :
                        'text-red-600'
                      }`}>
                        {probability}%
                      </div>
                      {priceChange !== 0 && (
                        <div className={`text-sm font-semibold flex items-center justify-end gap-1 ${
                          isPositive ? 'text-green-600' : 'text-red-600'
                        }`}>
                          <span>{isPositive ? '▲' : '▼'}</span>
                          <span>{Math.abs(priceChange)}</span>
                        </div>
                      )}
                    </div>

                    {/* Probability Bar */}
                    <div className="w-64">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            probability >= 70 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                            probability >= 40 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                            'bg-gradient-to-r from-red-400 to-red-600'
                          }`}
                          style={{ width: `${probability}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Yes/No Buttons */}
                  {!option.resolved ? (
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/market/${option.id}?side=yes&action=buy&mode=${mode}`);
                        }}
                        className="px-6 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg transition border border-blue-200"
                      >
                        Yes
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/market/${option.id}?side=no&action=buy&mode=${mode}`);
                        }}
                        className="px-6 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded-lg transition border border-purple-200"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                      option.outcome 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {option.outcome ? 'Resolved YES' : 'Resolved NO'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Comments Section - ADD THIS */}
        <Comments marketGroupId={marketGroup.id} userId={userId} />
      </main>
    </div>
  );
}
