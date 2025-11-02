'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import FilterBar from '@/components/FilterBar';
import MarketCard from '@/components/MarketCard';

const markets = [
  {
    id: 1,
    title: 'Will Bitcoin close above $80,000 by December 31, 2025?',
    probability: 75,
    volume: '$124.5K',
    endDate: 'Dec 31, 2025',
    category: 'Crypto'
  },
  {
    id: 2,
    title: 'Will Ethereum reach $5,000 by end of 2025?',
    probability: 62,
    volume: '$89.2K',
    endDate: 'Dec 31, 2025',
    category: 'Crypto'
  },
  {
    id: 3,
    title: 'Will AI replace 50% of coding jobs by 2030?',
    probability: 38,
    volume: '$56.8K',
    endDate: 'Jan 1, 2030',
    category: 'Technology'
  },
  {
    id: 4,
    title: 'Will SpaceX land humans on Mars by 2030?',
    probability: 45,
    volume: '$203.4K',
    endDate: 'Dec 31, 2030',
    category: 'Space'
  },
  {
    id: 5,
    title: 'Will Trump win the 2024 US Presidential Election?',
    probability: 52,
    volume: '$1.2M',
    endDate: 'Nov 5, 2024',
    category: 'Politics'
  },
  {
    id: 6,
    title: 'Will global temperatures rise by 1.5°C by 2030?',
    probability: 68,
    volume: '$78.3K',
    endDate: 'Dec 31, 2030',
    category: 'Climate'
  },
  {
    id: 7,
    title: 'Will the next GTA game release before 2026?',
    probability: 34,
    volume: '$145.7K',
    endDate: 'Dec 31, 2025',
    category: 'Entertainment'
  },
  {
    id: 8,
    title: 'Will Lionel Messi win another Ballon d\'Or before retirement?',
    probability: 28,
    volume: '$92.3K',
    endDate: 'Dec 31, 2026',
    category: 'Sports'
  },
  {
    id: 9,
    title: 'Will Apple release AR glasses by 2026?',
    probability: 55,
    volume: '$167.9K',
    endDate: 'Dec 31, 2026',
    category: 'Technology'
  },
  {
    id: 10,
    title: 'Will any country ban TikTok nationwide by end of 2025?',
    probability: 71,
    volume: '$234.1K',
    endDate: 'Dec 31, 2025',
    category: 'Politics'
  },
  {
    id: 11,
    title: 'Will the Olympics add esports as an official event by 2028?',
    probability: 42,
    volume: '$78.5K',
    endDate: 'Jul 14, 2028',
    category: 'Sports'
  },
  {
    id: 12,
    title: 'Will Netflix subscriber count exceed 300M by 2026?',
    probability: 59,
    volume: '$112.6K',
    endDate: 'Dec 31, 2026',
    category: 'Entertainment'
  }
];

const categories = ['Crypto', 'Technology', 'Space', 'Politics', 'Entertainment', 'Sports', 'Climate'];

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredMarkets = markets.filter(market => {
    const matchesSearch = market.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || market.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Active Prediction Markets
          </h1>
          <p className="text-xl text-gray-600">
            Trade on the outcome of future events using USDC
          </p>
        </div>

        <FilterBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          categories={categories}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMarkets.length > 0 ? (
            filteredMarkets.map(market => (
              <MarketCard
                key={market.id}
                id={market.id}              // 🆕 ADDED THIS LINE
                title={market.title}
                probability={market.probability}
                volume={market.volume}
                endDate={market.endDate}
                category={market.category}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 text-lg">No markets found matching your criteria</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}