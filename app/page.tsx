'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import FilterBar from '@/components/FilterBar';
import MarketCard from '@/components/MarketCard';
import { CATEGORIES } from '@/lib/data/markets';

interface Market {
  id: number;
  title: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  totalVolume: number;
  endDate: string;
  resolved: boolean;
}

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'resolved'>('active');

  // Fetch markets from API
  useEffect(() => {
    async function fetchMarkets() {
      try {
        const response = await fetch('/api/markets');
        const data = await response.json();
        setMarkets(data.markets);
      } catch (error) {
        console.error('Error fetching markets:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchMarkets();
  }, []);

  // Filter markets by active/resolved tab
  const tabFilteredMarkets = markets.filter(market => {
    if (activeTab === 'active') {
      return !market.resolved;
    } else {
      return market.resolved;
    }
  });

  // Then apply search and category filters
  const filteredMarkets = tabFilteredMarkets.filter(market => {
    const matchesSearch = market.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || market.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate probability from prices
  const getMarketWithProbability = (market: Market) => {
    const probability = Math.round(Number(market.yesPrice) * 100);
    const volume = `$${(Number(market.totalVolume) / 1000).toFixed(1)}K`;
    const endDate = new Date(market.endDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    return {
      ...market,
      probability,
      volume,
      endDate
    };
  };

  const activeCount = markets.filter(m => !m.resolved).length;
  const resolvedCount = markets.filter(m => m.resolved).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Prediction Markets
          </h1>
          <p className="text-xl text-gray-600">
            Trade on the outcome of future events using USDC
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow-md p-1 inline-flex">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-3 rounded-md font-semibold transition-all ${
                activeTab === 'active'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Active Markets
              {activeCount > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'active' ? 'bg-blue-500' : 'bg-gray-200'
                }`}>
                  {activeCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('resolved')}
              className={`px-6 py-3 rounded-md font-semibold transition-all ${
                activeTab === 'resolved'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Resolved Markets
              {resolvedCount > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'resolved' ? 'bg-blue-500' : 'bg-gray-200'
                }`}>
                  {resolvedCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <FilterBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          categories={Array.from(CATEGORIES)}
        />

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 mt-4">Loading markets...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMarkets.length > 0 ? (
              filteredMarkets.map(market => {
                const marketData = getMarketWithProbability(market);
                return (
                  <MarketCard
                    key={market.id}
                    id={market.id}
                    title={market.title}
                    probability={marketData.probability}
                    volume={marketData.volume}
                    endDate={marketData.endDate}
                    category={market.category}
                    resolved={market.resolved}
                    outcome={market.outcome}
                  />
                );
              })
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 text-lg">
                  {activeTab === 'active' 
                    ? 'No active markets found matching your criteria' 
                    : 'No resolved markets found matching your criteria'
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}