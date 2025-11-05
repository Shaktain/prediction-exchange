'use client';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PriceChartProps {
  marketId: number;
  side: 'yes' | 'no';
}

export default function PriceChart({ marketId, side }: PriceChartProps) {
  const [timeframe, setTimeframe] = useState('1W');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPriceHistory();
  }, [marketId, side, timeframe]);

  async function fetchPriceHistory() {
    setLoading(true);
    try {
      const response = await fetch(`/api/price-history?marketId=${marketId}&side=${side}&timeframe=${timeframe}`);
      const result = await response.json();
      setData(result.data || []);
    } catch (error) {
      console.error('Error fetching price history:', error);
    } finally {
      setLoading(false);
    }
  }

  const timeframes = ['1D', '3D', '1W', '1M', '1Y', 'MAX'];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          {side === 'yes' ? 'YES' : 'NO'} Price History
        </h2>
        
        <div className="flex gap-1">
          {timeframes.map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 text-sm font-medium rounded ${
                timeframe === tf
                  ? side === 'yes' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-500">Loading chart...</div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-500">No price history yet</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis 
              domain={[0, 1]}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
            />
            <Tooltip 
              formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Price']}
              labelFormatter={(label) => new Date(label).toLocaleString()}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke={side === 'yes' ? '#10b981' : '#ef4444'}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}