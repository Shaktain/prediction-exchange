'use client';
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useTradingMode } from '@/lib/contexts/TradingModeContext'; // ← ADD THIS

interface OrderLevel {
  price: number;
  totalQuantity: number;
  orderCount: number;
}

interface OrderBookData {
  yesBids: OrderLevel[];
  yesAsks: OrderLevel[];
  noBids: OrderLevel[];
  noAsks: OrderLevel[];
}

interface OrderBookProps {
  marketId: number;
  selectedSide?: 'yes' | 'no';
}

export default function OrderBook({ marketId, selectedSide = 'yes' }: OrderBookProps) {
  const { mode } = useTradingMode(); // ← ADD THIS
  const [orderBook, setOrderBook] = useState<OrderBookData>({
    yesBids: [],
    yesAsks: [],
    noBids: [],
    noAsks: []
  });
  const [loading, setLoading] = useState(true);
  const [viewSide, setViewSide] = useState<'yes' | 'no'>(selectedSide);

  useEffect(() => {
    fetchOrderBook();
    const interval = setInterval(fetchOrderBook, 2000);
    return () => clearInterval(interval);
  }, [marketId, mode]); // ← ADD mode to dependencies

  useEffect(() => {
    setViewSide(selectedSide);
  }, [selectedSide]);

  async function fetchOrderBook() {
    try {
      const response = await fetch(`/api/orderbook?marketId=${marketId}&mode=${mode}`); // ← ADD mode parameter
      const data = await response.json();
      setOrderBook(data.orderBook);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching order book:', error);
    }
  }

  // Rest of the component stays the same...
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Order Book</h3>
        <div className="text-center py-8 text-gray-500">Loading...</div>
      </div>
    );
  }

  const bids = viewSide === 'yes' ? orderBook.yesBids : orderBook.noBids;
  const asks = viewSide === 'yes' ? orderBook.yesAsks : orderBook.noAsks;
  
  const maxBidQuantity = Math.max(...bids.map(o => o.totalQuantity), 1);
  const maxAskQuantity = Math.max(...asks.map(o => o.totalQuantity), 1);

  const spread = calculateSpread(bids, asks);
  const totalDepth = getTotalDepth(bids, asks);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Order Book</h3>
        
        <div className="flex gap-2">
          <button
            onClick={() => setViewSide('yes')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewSide === 'yes'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            YES Book
          </button>
          <button
            onClick={() => setViewSide('no')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewSide === 'no'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            NO Book
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* ASKS (Sell Orders) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className={`w-4 h-4 ${viewSide === 'yes' ? 'text-green-600' : 'text-red-600'}`} />
            <span className={`font-semibold ${viewSide === 'yes' ? 'text-green-600' : 'text-red-600'}`}>
              {viewSide === 'yes' ? 'YES' : 'NO'} Asks (Sell)
            </span>
          </div>

          <div className="space-y-1">
            <div className="grid grid-cols-3 text-xs text-gray-500 mb-2">
              <div>Price</div>
              <div className="text-right">Shares</div>
              <div className="text-right">Orders</div>
            </div>

            {asks.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-4">No asks</div>
            ) : (
              [...asks].reverse().slice(0, 10).map((level, idx) => (
                <div key={idx} className="relative">
                  <div 
                    className={`absolute inset-0 ${viewSide === 'yes' ? 'bg-green-50' : 'bg-red-50'} opacity-50`}
                    style={{ width: `${(level.totalQuantity / maxAskQuantity) * 100}%` }}
                  />
                  
                  <div className="relative grid grid-cols-3 text-sm py-1">
                    <div className={`font-medium ${viewSide === 'yes' ? 'text-green-600' : 'text-red-600'}`}>
                      ${level.price.toFixed(3)}
                    </div>
                    <div className="text-right text-gray-900">
                      {level.totalQuantity.toFixed(0)}
                    </div>
                    <div className="text-right text-gray-500">
                      {level.orderCount}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* BIDS (Buy Orders) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className={`w-4 h-4 ${viewSide === 'yes' ? 'text-green-600' : 'text-red-600'}`} />
            <span className={`font-semibold ${viewSide === 'yes' ? 'text-green-600' : 'text-red-600'}`}>
              {viewSide === 'yes' ? 'YES' : 'NO'} Bids (Buy)
            </span>
          </div>

          <div className="space-y-1">
            <div className="grid grid-cols-3 text-xs text-gray-500 mb-2">
              <div>Price</div>
              <div className="text-right">Shares</div>
              <div className="text-right">Orders</div>
            </div>

            {bids.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-4">No bids</div>
            ) : (
              bids.slice(0, 10).map((level, idx) => (
                <div key={idx} className="relative">
                  <div 
                    className={`absolute inset-0 ${viewSide === 'yes' ? 'bg-green-50' : 'bg-red-50'} opacity-50`}
                    style={{ width: `${(level.totalQuantity / maxBidQuantity) * 100}%` }}
                  />
                  
                  <div className="relative grid grid-cols-3 text-sm py-1">
                    <div className={`font-medium ${viewSide === 'yes' ? 'text-green-600' : 'text-red-600'}`}>
                      ${level.price.toFixed(3)}
                    </div>
                    <div className="text-right text-gray-900">
                      {level.totalQuantity.toFixed(0)}
                    </div>
                    <div className="text-right text-gray-500">
                      {level.orderCount}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Spread: </span>
            <span className="font-semibold">
              ${spread.toFixed(4)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-gray-500">Total Depth: </span>
            <span className="font-semibold">
              {totalDepth.toFixed(0)} shares
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function calculateSpread(bids: OrderLevel[], asks: OrderLevel[]): number {
  if (bids.length === 0 || asks.length === 0) return 0;
  const bestBid = bids[0].price;
  const bestAsk = asks[asks.length - 1]?.price || asks[0].price;
  return Math.abs(bestAsk - bestBid);
}

function getTotalDepth(bids: OrderLevel[], asks: OrderLevel[]): number {
  const bidDepth = bids.reduce((sum, level) => sum + level.totalQuantity, 0);
  const askDepth = asks.reduce((sum, level) => sum + level.totalQuantity, 0);
  return bidDepth + askDepth;
}