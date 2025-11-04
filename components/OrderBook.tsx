'use client';
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface OrderLevel {
  price: number;
  totalQuantity: number;
  orderCount: number;
}

interface OrderBookProps {
  marketId: number;
}

export default function OrderBook({ marketId }: OrderBookProps) {
  const [orderBook, setOrderBook] = useState<{
    yes: OrderLevel[];
    no: OrderLevel[];
  }>({ yes: [], no: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderBook();
    
    // Refresh every 2 seconds
    const interval = setInterval(fetchOrderBook, 2000);
    
    return () => clearInterval(interval);
  }, [marketId]);

  async function fetchOrderBook() {
    try {
      const response = await fetch(`/api/orderbook?marketId=${marketId}`);
      const data = await response.json();
      setOrderBook(data.orderBook);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching order book:', error);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Order Book</h3>
        <div className="text-center py-8 text-gray-500">Loading...</div>
      </div>
    );
  }

  const maxYesQuantity = Math.max(...orderBook.yes.map(o => o.totalQuantity), 1);
  const maxNoQuantity = Math.max(...orderBook.no.map(o => o.totalQuantity), 1);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Order Book</h3>

      <div className="grid grid-cols-2 gap-6">
        {/* YES Bids */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="font-semibold text-green-600">YES Bids</span>
          </div>

          <div className="space-y-1">
            <div className="grid grid-cols-3 text-xs text-gray-500 mb-2">
              <div>Price</div>
              <div className="text-right">Shares</div>
              <div className="text-right">Orders</div>
            </div>

            {orderBook.yes.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-4">No bids</div>
            ) : (
              orderBook.yes.slice(0, 10).map((level, idx) => (
                <div key={idx} className="relative">
                  {/* Depth bar */}
                  <div 
                    className="absolute inset-0 bg-green-50 opacity-50"
                    style={{ width: `${(level.totalQuantity / maxYesQuantity) * 100}%` }}
                  />
                  
                  {/* Order data */}
                  <div className="relative grid grid-cols-3 text-sm py-1">
                    <div className="font-medium text-green-600">
                      ${level.price.toFixed(2)}
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

        {/* NO Asks */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <span className="font-semibold text-red-600">NO Asks</span>
          </div>

          <div className="space-y-1">
            <div className="grid grid-cols-3 text-xs text-gray-500 mb-2">
              <div>Price</div>
              <div className="text-right">Shares</div>
              <div className="text-right">Orders</div>
            </div>

            {orderBook.no.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-4">No asks</div>
            ) : (
              orderBook.no.slice(0, 10).map((level, idx) => (
                <div key={idx} className="relative">
                  {/* Depth bar */}
                  <div 
                    className="absolute inset-0 bg-red-50 opacity-50"
                    style={{ width: `${(level.totalQuantity / maxNoQuantity) * 100}%` }}
                  />
                  
                  {/* Order data */}
                  <div className="relative grid grid-cols-3 text-sm py-1">
                    <div className="font-medium text-red-600">
                      ${level.price.toFixed(2)}
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
              ${calculateSpread(orderBook).toFixed(3)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-gray-500">Total Depth: </span>
            <span className="font-semibold">
              {(getTotalDepth(orderBook)).toFixed(0)} shares
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function calculateSpread(orderBook: { yes: OrderLevel[]; no: OrderLevel[] }): number {
  if (orderBook.yes.length === 0 || orderBook.no.length === 0) return 0;
  
  const bestYes = orderBook.yes[0].price;
  const bestNo = orderBook.no[0].price;
  
  return Math.abs((1 - bestYes) - bestNo);
}

function getTotalDepth(orderBook: { yes: OrderLevel[]; no: OrderLevel[] }): number {
  const yesDepth = orderBook.yes.reduce((sum, level) => sum + level.totalQuantity, 0);
  const noDepth = orderBook.no.reduce((sum, level) => sum + level.totalQuantity, 0);
  return yesDepth + noDepth;
}