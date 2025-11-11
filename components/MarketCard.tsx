'use client';
import { TrendingUp, Clock, DollarSign, CheckCircle, XCircle, Star, Droplet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getCategoryColor } from '@/lib/utils/market-helpers';
import { useState } from 'react';

interface MarketOption {
  id: number;
  optionText: string;
  yesPrice: number;
  noPrice: number;
  resolved: boolean;
  outcome: boolean | null;
}

interface MarketCardProps {
  // For single markets
  id?: number;
  title?: string;
  probability?: number;
  yesPrice?: number;
  noPrice?: number;
  resolved?: boolean;
  outcome?: boolean | null;
  priceChange?: number;
  
  // For multi-option markets
  marketGroupId?: number;
  question?: string;
  thumbnail?: string;
  options?: MarketOption[];
  
  // Common props
  volume: string;
  volume24h?: number;
  liquidity?: string;
  category: string;
  trending?: boolean;
  
  // Display mode
  showPrices?: boolean; // NEW PROP
}

export default function MarketCard(props: MarketCardProps) {
  const router = useRouter();
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  
  const isMultiOption = props.marketGroupId && props.options;
  
  // Sort options by probability (highest first)
  const sortedOptions = isMultiOption 
    ? [...props.options!].sort((a, b) => (b.yesPrice - a.yesPrice))
    : [];

  const toggleWatchlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsWatchlisted(!isWatchlisted);
    // TODO: Call API to save watchlist preference
  };

  const handleOptionClick = (e: React.MouseEvent, optionId: number, side: 'yes' | 'no') => {
    e.stopPropagation();
    router.push(`/market/${optionId}?side=${side}&action=buy`);
  };

  // Calculate volume change percentage
  const volumeChange = props.volume24h ? 
    ((props.volume24h / parseFloat(props.volume.replace(/[^0-9.]/g, ''))) * 100).toFixed(1) 
    : null;

  if (isMultiOption) {
    // MULTI-OPTION MARKET CARD
    return (
      <div 
        onClick={() => router.push(`/market-group/${props.marketGroupId}`)}
        className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 relative"
      >
        {/* Category and Trending Badge */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            {props.thumbnail && (
              <span className="text-2xl">{props.thumbnail}</span>
            )}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(props.category)}`}>
              {props.category}
            </span>
            {props.trending && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Trending
              </span>
            )}
          </div>
          <button
            onClick={toggleWatchlist}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <Star 
              className={`w-5 h-5 ${isWatchlisted ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`}
            />
          </button>
        </div>

        {/* Question */}
        <h3 className="text-lg font-bold text-gray-900 mb-4 line-clamp-2">
          {props.question}
        </h3>

        {/* Options List */}
        <div className="space-y-2 mb-4">
          {sortedOptions.slice(0, 3).map((option) => {
            const probability = Math.round(option.yesPrice * 100);
            const yesBidPrice = (option.yesPrice).toFixed(2);
            const noBidPrice = (option.noPrice).toFixed(2);
            
            return (
              <div 
                key={option.id}
                className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                {/* Option Text */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {option.optionText}
                  </div>
                </div>

                {/* Probability */}
                <div className="flex items-center gap-3 ml-4">
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      probability >= 70 ? 'text-green-600' :
                      probability >= 40 ? 'text-gray-700' :
                      'text-red-600'
                    }`}>
                      {probability}%
                    </div>
                  </div>

                  {/* Yes/No Buttons - ALWAYS VISIBLE NOW */}
                  {props.showPrices ? (
                    // PRICE MODE - Show $ amounts with color
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => handleOptionClick(e, option.id, 'yes')}
                        className="px-3 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded text-xs font-semibold transition border border-green-200"
                      >
                        ${yesBidPrice}
                      </button>
                      <button
                        onClick={(e) => handleOptionClick(e, option.id, 'no')}
                        className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-xs font-semibold transition border border-red-200"
                      >
                        ${noBidPrice}
                      </button>
                    </div>
                  ) : (
                    // BOX MODE - Show YES/NO text
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => handleOptionClick(e, option.id, 'yes')}
                        className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs font-semibold transition"
                      >
                        Yes
                      </button>
                      <button
                        onClick={(e) => handleOptionClick(e, option.id, 'no')}
                        className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-semibold transition"
                      >
                        No
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {sortedOptions.length > 3 && (
            <div className="text-center text-sm text-gray-500 py-2">
              +{sortedOptions.length - 3} more option{sortedOptions.length - 3 > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Volume and Liquidity */}
        <div className="flex justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              <span>Vol: {props.volume}</span>
              {volumeChange && (
                <span className={`ml-1 ${parseFloat(volumeChange) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {volumeChange > 0 ? '+' : ''}{volumeChange}%
                </span>
              )}
            </div>
            {props.liquidity && (
              <div className="flex items-center gap-1">
                <Droplet className="w-3 h-3" />
                <span>Liq: {props.liquidity}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } else {
    // SINGLE MARKET CARD
    const probability = props.probability || Math.round((props.yesPrice || 0.5) * 100);
    const yesBidPrice = (props.yesPrice || 0.5).toFixed(2);
    const noBidPrice = (props.noPrice || 0.5).toFixed(2);

    return (
      <div 
        onClick={() => router.push(`/market/${props.id}`)}
        className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 relative"
      >
        {/* Category and Trending */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(props.category)}`}>
              {props.category}
            </span>
            {props.trending && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Trending
              </span>
            )}
          </div>
          <button
            onClick={toggleWatchlist}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <Star 
              className={`w-5 h-5 ${isWatchlisted ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`}
            />
          </button>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-4 line-clamp-2">
          {props.title}
        </h3>

        {props.resolved ? (
          // Resolved Market
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Outcome</div>
              <div className={`text-2xl font-bold ${props.outcome ? 'text-green-600' : 'text-red-600'}`}>
                {props.outcome ? 'YES' : 'NO'}
              </div>
            </div>
          </div>
        ) : (
          // Active Market
          <>
            {/* Probability Display */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Probability</span>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${
                    probability >= 70 ? 'text-green-600' :
                    probability >= 40 ? 'text-gray-900' :
                    'text-red-600'
                  }`}>
                    {probability}%
                  </span>
                  {props.priceChange !== undefined && props.priceChange !== 0 && (
                    <span className={`text-sm font-semibold flex items-center gap-0.5 ${
                      props.priceChange > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <span>{props.priceChange > 0 ? '▲' : '▼'}</span>
                      <span>{Math.abs(props.priceChange)}</span>
                    </span>
                  )}
                </div>
              </div>
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

            {/* Yes/No Boxes */}
            {props.showPrices ? (
              // PRICE MODE
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/market/${props.id}?side=yes&action=buy`);
                  }}
                  className="bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-3 transition group"
                >
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-700">${yesBidPrice}</div>
                    <div className="text-xs text-green-600 mt-1">BUY YES</div>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/market/${props.id}?side=no&action=buy`);
                  }}
                  className="bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg p-3 transition group"
                >
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-700">${noBidPrice}</div>
                    <div className="text-xs text-red-600 mt-1">BUY NO</div>
                  </div>
                </button>
              </div>
            ) : (
              // BOX MODE (original)
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/market/${props.id}?side=yes&action=buy`);
                  }}
                  className="bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-3 transition group"
                >
                  <div className="text-center">
                    <div className="text-sm font-semibold text-green-700 mb-1">YES</div>
                    <div className="text-xs text-green-600">${yesBidPrice}</div>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/market/${props.id}?side=no&action=buy`);
                  }}
                  className="bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg p-3 transition group"
                >
                  <div className="text-center">
                    <div className="text-sm font-semibold text-red-700 mb-1">NO</div>
                    <div className="text-xs text-red-600">${noBidPrice}</div>
                  </div>
                </button>
              </div>
            )}
          </>
        )}

        {/* Volume and Liquidity */}
        <div className="flex justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              <span>Vol: {props.volume}</span>
              {volumeChange && (
                <span className={`ml-1 ${parseFloat(volumeChange) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {volumeChange > 0 ? '+' : ''}{volumeChange}%
                </span>
              )}
            </div>
            {props.liquidity && (
              <div className="flex items-center gap-1">
                <Droplet className="w-3 h-3" />
                <span>Liq: {props.liquidity}</span>
              </div>
            )}
          </div>
        </div>

        {/* Trade Button for Resolved Markets */}
        {props.resolved && (
          <div className="mt-4">
            <button 
              disabled
              className="w-full py-3 rounded-lg font-semibold bg-gray-300 text-gray-500 cursor-not-allowed"
            >
              Market Closed
            </button>
          </div>
        )}
      </div>
    );
  }
}
