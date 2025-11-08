'use client';
import { useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Star } from 'lucide-react';

interface Market {
  id: number;
  optionText: string;
  yesPrice: number;
  noPrice: number;
  totalVolume: number;
  totalLiquidity: number;
}

interface MarketGroupCardProps {
  id: number;
  question: string;
  category: string;
  markets: Market[];
  totalVolume: number;
  isTrending?: boolean;
}

export default function MarketGroupCard({ 
  id, 
  question, 
  category, 
  markets,
  totalVolume,
  isTrending 
}: MarketGroupCardProps) {
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  
  // Sort by highest probability and take first 2
  const sortedMarkets = [...markets].sort((a, b) => b.yesPrice - a.yesPrice);
  const displayMarkets = sortedMarkets.slice(0, 2);
  const hasMore = markets.length > 2;
  
  // Calculate total liquidity
  const totalLiquidity = markets.reduce((sum, m) => sum + m.totalLiquidity, 0);
  
  // Get midpoint price (average of best bid and ask)
  const getMidpoint = (market: Market) => {
    return ((market.yesPrice + (1 - market.noPrice)) / 2 * 100).toFixed(0);
  };
  
  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-6 relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
              {category}
            </span>
            {isTrending && (
              <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
                <TrendingUp className="w-3 h-3" />
                Trending
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
            {question}
          </h3>
        </div>
        
        <button
          onClick={(e) => {
            e.preventDefault();
            setIsWatchlisted(!isWatchlisted);
          }}
          className="ml-2"
        >
          <Star 
            className={`w-5 h-5 ${isWatchlisted ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`}
          />
        </button>
      </div>
      
      {/* Options */}
      <div className="space-y-3 mb-4">
        {displayMarkets.map((market) => (
          <div 
            key={market.id}
            className="flex items-center justify-between gap-4"
          >
            <span className="text-sm text-gray-700 flex-1 line-clamp-1">
              {market.optionText}
            </span>
            
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-900 min-w-[3rem] text-right">
                {getMidpoint(market)}%
              </span>
              
              <div className="flex gap-2">
                <Link
                  href={`/market/${market.id}?side=yes`}
                  className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-semibold rounded transition-colors"
                >
                  Yes
                  <div className="text-[10px] opacity-75">
                    ${market.yesPrice.toFixed(2)}
                  </div>
                </Link>
                
                <Link
                  href={`/market/${market.id}?side=no`}
                  className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded transition-colors"
                >
                  No
                  <div className="text-[10px] opacity-75">
                    ${market.noPrice.toFixed(2)}
                  </div>
                </Link>
              </div>
            </div>
          </div>
        ))}
        
        {hasMore && (
          <Link
            href={`/market-group/${id}`}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all {markets.length} options →
          </Link>
        )}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
        <div className="flex gap-4">
          <span>Vol. ${(totalVolume / 1000).toFixed(1)}K</span>
          <span>Liq. ${(totalLiquidity / 1000).toFixed(1)}K</span>
        </div>
      </div>
    </div>
  );
}