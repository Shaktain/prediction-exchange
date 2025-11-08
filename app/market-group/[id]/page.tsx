'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { ArrowLeft, TrendingUp } from 'lucide-react';

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
  const [marketGroup, setMarketGroup] = useState<MarketGroup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMarketGroup() {
      try {
        const response = await fetch(`/api/market-groups/${params.id}`);
        if (!response.ok) {
          throw new Error('Market group not found');
        }
        const data = await response.json();
        setMarketGroup(data.marketGroup);
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

        <div className="grid grid-cols-1 gap-4">
          {sortedOptions.map((option, index) => {
            const probability = Math.round(option.yesPrice * 100);
            
            return (
              <div
                key={option.id}
                onClick={() => router.push(`/market/${option.id}`)}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-lg font-bold text-gray-700">
                        #{index + 1}
                      </span>
                      <h3 className="text-xl font-bold text-gray-900">
                        {option.optionText}
                      </h3>
                      {option.resolved && (
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          option.outcome 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {option.outcome ? 'Resolved YES' : 'Resolved NO'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-6">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Probability</div>
                        <div className={`text-3xl font-bold ${
                          probability >= 70 ? 'text-green-600' :
                          probability >= 40 ? 'text-gray-900' :
                          'text-red-600'
                        }`}>
                          {probability}%
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${
                              probability >= 70 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                              probability >= 40 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                              'bg-gradient-to-r from-red-400 to-red-600'
                            }`}
                            style={{ width: `${probability}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-600 mb-1">Volume</div>
                        <div className="text-lg font-semibold text-gray-900">
                          ${(Number(option.totalVolume) / 1000).toFixed(1)}K
                        </div>
                      </div>
                    </div>
                  </div>

                  {!option.resolved && (
                    <div className="flex gap-3 ml-6">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/market/${option.id}?side=yes&action=buy`);
                        }}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
                      >
                        Buy YES
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/market/${option.id}?side=no&action=buy`);
                        }}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
                      >
                        Buy NO
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
