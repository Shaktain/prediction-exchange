'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import FilterBar from '@/components/FilterBar';
import MarketCard from '@/components/MarketCard';
import { CATEGORIES } from '@/lib/data/markets';
import { DollarSign, LayoutGrid } from 'lucide-react';

interface SingleMarket {
  type: 'single';
  id: number;
  title: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  totalVolume: number;
  volume24h: number;
  totalLiquidity: number;
  endDate: string;
  resolved: boolean;
  outcome?: boolean | null;
  trending: boolean;
  priceChange?: number;
}

interface MarketOption {
  id: number;
  optionText: string;
  yesPrice: number;
  noPrice: number;
  resolved: boolean;
  outcome: boolean | null;
}

interface MarketGroup {
  type: 'group';
  id: number;
  question: string;
  description: string;
  category: string;
  thumbnail: string;
  options: MarketOption[];
  totalVolume: number;
  totalVolume24h: number;
  totalLiquidity: number;
  trending: boolean;
}

type Market = SingleMarket | MarketGroup;

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'resolved'>('active');
  const [showPrices, setShowPrices] = useState(false);

  // Fetch markets from API
  useEffect(() => {
    async function fetchMarkets() {
      try {
        const response = await fetch('/api/markets');
        const data = await response.json();
        setMarkets(data.markets || []);
      } catch (error) {
        console.error('Error fetching markets:', error);
        setMarkets([]);
      } finally {
        setLoading(false);
      }
    }
    fetchMarkets();
  }, []);

  // Filter markets by active/resolved tab
  const tabFilteredMarkets = (markets || []).filter(market => {
    if (market.type === 'single') {
      if (activeTab === 'active') {
        return !market.resolved;
      } else {
        return market.resolved;
      }
    } else {
      // For market groups, check if any option matches the tab
      const hasActiveOptions = market.options.some(opt => !opt.resolved);
      const hasResolvedOptions = market.options.some(opt => opt.resolved);
      
      if (activeTab === 'active') {
        return hasActiveOptions;
      } else {
        return hasResolvedOptions;
      }
    }
  });

  // Apply search and category filters
  const filteredMarkets = tabFilteredMarkets.filter(market => {
    const searchText = market.type === 'single' ? (market.title || '') : (market.question || '');
    const matchesSearch = searchText.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || market.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Format volume for display
  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`;
    } else {
      return `$${volume.toFixed(0)}`;
    }
  };

  const activeCount = (markets || []).filter(m => {
    if (m.type === 'single') return !m.resolved;
    return m.options.some(opt => !opt.resolved);
  }).length;
  
  const resolvedCount = (markets || []).filter(m => {
    if (m.type === 'single') return m.resolved;
    return m.options.some(opt => opt.resolved);
  }).length;

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

        {/* Filter Bar with Toggle */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Filter Bar */}
            <div className="flex-1">
              <FilterBar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                categories={Array.from(CATEGORIES)}
              />
            </div>

            {/* Price/Box Toggle */}
            <div className="flex items-center gap-3 bg-white rounded-lg p-1 border border-gray-200 shadow-sm self-start lg:self-auto">
              <button
                onClick={() => setShowPrices(false)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md font-medium transition-all ${
                  !showPrices
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                title="Show YES/NO boxes"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="text-sm font-semibold">Boxes</span>
              </button>
              <button
                onClick={() => setShowPrices(true)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md font-medium transition-all ${
                  showPrices
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                title="Show prices in dollars"
              >
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-semibold">Prices</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 mt-4">Loading markets...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMarkets.length > 0 ? (
              filteredMarkets.map(market => {
                if (market.type === 'single') {
                  const probability = Math.round(market.yesPrice * 100);
                  return (
                    <MarketCard
                      key={`single-${market.id}`}
                      id={market.id}
                      title={market.title}
                      probability={probability}
                      yesPrice={market.yesPrice}
                      noPrice={market.noPrice}
                      volume={formatVolume(market.totalVolume)}
                      volume24h={market.volume24h}
                      liquidity={formatVolume(market.totalLiquidity)}
                      category={market.category}
                      resolved={market.resolved}
                      outcome={market.outcome}
                      trending={market.trending}
                      priceChange={market.priceChange}
                      showPrices={showPrices}
                    />
                  );
                } else {
                  return (
                    <MarketCard
                      key={`group-${market.id}`}
                      marketGroupId={market.id}
                      question={market.question}
                      thumbnail={market.thumbnail}
                      options={market.options}
                      volume={formatVolume(market.totalVolume)}
                      volume24h={market.totalVolume24h}
                      liquidity={formatVolume(market.totalLiquidity)}
                      category={market.category}
                      trending={market.trending}
                      showPrices={showPrices}
                    />
                  );
                }
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
