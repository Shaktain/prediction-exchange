'use client';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import Header from '@/components/Header';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface Position {
  id: string;
  marketId: number;
  yesShares: number;
  noShares: number;
  avgYesCost: number;
  avgNoCost: number;
  realizedPnL: number;
  unrealizedPnL: number;
  market: {
    id: number;
    title: string;
    category: string;
    yesPrice: number;
    noPrice: number;
    resolved: boolean;
    outcome: boolean | null;
  };
}

interface Order {
  id: string;
  marketId: number;
  side: string;
  type: string;
  price: number;
  quantity: number;
  filled: number;
  status: string;
  createdAt: string;
  market: {
    title: string;
    category: string;
  };
}

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected || !address) {
      setLoading(false);
      return;
    }

    async function fetchPortfolio() {
      try {
        // Register/get user
        const userResponse = await fetch('/api/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: address })
        });
        const userData = await userResponse.json();
        setUserId(userData.userId);
        setBalance(userData.balance);

        // Fetch positions
        const positionsResponse = await fetch(`/api/positions?userId=${userData.userId}`);
        const positionsData = await positionsResponse.json();
        setPositions(positionsData.positions || []);

        // Fetch orders
        const ordersResponse = await fetch(`/api/orders?userId=${userData.userId}`);
        const ordersData = await ordersResponse.json();
        setOrders(ordersData.orders || []);
      } catch (error) {
        console.error('Error fetching portfolio:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPortfolio();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchPortfolio, 5000);
    
    return () => clearInterval(interval);
  }, [address, isConnected]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Connect Your Wallet</h1>
          <p className="text-gray-600">Please connect your wallet to view your portfolio</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 mt-4">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  const totalValue = positions.reduce((sum, pos) => {
    // For resolved markets, value is 0 (already settled)
    if (pos.market.resolved) return sum;
    
    const yesValue = Number(pos.yesShares) * Number(pos.market.yesPrice);
    const noValue = Number(pos.noShares) * Number(pos.market.noPrice);
    return sum + yesValue + noValue;
  }, 0);

  const totalPnL = positions.reduce((sum, pos) => {
    // For resolved markets, use realized P&L
    if (pos.market.resolved) {
      return sum + Number(pos.realizedPnL);
    }
    // For active markets, use unrealized P&L
    return sum + Number(pos.unrealizedPnL);
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">My Portfolio</h1>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center text-gray-500 mb-2">
              <DollarSign className="w-5 h-5 mr-2" />
              <span className="text-sm font-semibold">Available Balance</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">${balance.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center text-gray-500 mb-2">
              <DollarSign className="w-5 h-5 mr-2" />
              <span className="text-sm font-semibold">Position Value</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">${totalValue.toFixed(2)}</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center text-gray-500 mb-2">
              {totalPnL >= 0 ? (
                <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 mr-2 text-red-500" />
              )}
              <span className="text-sm font-semibold">Total P&L</span>
            </div>
            <p className={`text-3xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${totalPnL.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Active Positions */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Active Positions</h2>
          
          {positions.filter(p => !p.market.resolved).length === 0 ? (
            <p className="text-gray-500 text-center py-8">No active positions</p>
          ) : (
            <div className="space-y-4">
              {positions.filter(p => !p.market.resolved).map((position) => {
                return (
                  <div key={position.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {position.market.title}
                        </h3>
                        <div className="flex gap-2 items-center">
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                            {position.market.category}
                          </span>
                        </div>
                      </div>
                      <div className={`text-right ${Number(position.unrealizedPnL) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <div className="text-sm font-semibold">P&L</div>
                        <div className="text-lg font-bold">
                          ${Number(position.unrealizedPnL).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {Number(position.yesShares) > 0 && (
                        <div className="bg-green-50 rounded p-3">
                          <div className="text-green-700 font-semibold mb-1">YES Shares</div>
                          <div className="text-gray-900">
                            {Number(position.yesShares).toFixed(2)} @ ${Number(position.avgYesCost).toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Current: ${Number(position.market.yesPrice).toFixed(2)}
                          </div>
                        </div>
                      )}
                      
                      {Number(position.noShares) > 0 && (
                        <div className="bg-red-50 rounded p-3">
                          <div className="text-red-700 font-semibold mb-1">NO Shares</div>
                          <div className="text-gray-900">
                            {Number(position.noShares).toFixed(2)} @ ${Number(position.avgNoCost).toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Current: ${Number(position.market.noPrice).toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Resolved Positions */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Resolved Positions</h2>
          
          {positions.filter(p => p.market.resolved).length === 0 ? (
            <p className="text-gray-500 text-center py-8">No resolved positions</p>
          ) : (
            <div className="space-y-4">
              {positions.filter(p => p.market.resolved).map((position) => {
                const wonMarket = (position.market.outcome && Number(position.yesShares) > 0) ||
                                 (!position.market.outcome && Number(position.noShares) > 0);

                return (
                  <div key={position.id} className={`border-2 rounded-lg p-4 ${
                    wonMarket ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                  }`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {position.market.title}
                        </h3>
                        <div className="flex gap-2 items-center">
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                            {position.market.category}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            wonMarket 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {wonMarket ? '✓ WON' : '✗ LOST'}
                          </span>
                        </div>
                      </div>
                      <div className={`text-right ${wonMarket ? 'text-green-600' : 'text-red-600'}`}>
                        <div className="text-sm font-semibold">
                          {wonMarket ? 'Winnings' : 'Loss'}
                        </div>
                        <div className="text-lg font-bold">
                          {Number(position.realizedPnL) >= 0 ? '+' : ''}${Number(position.realizedPnL).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {Number(position.yesShares) > 0 && (
                        <div className={`rounded p-3 ${position.market.outcome ? 'bg-green-100 border-2 border-green-400' : 'bg-green-50'}`}>
                          <div className="text-green-700 font-semibold mb-1">
                            YES Shares {position.market.outcome && '✓'}
                          </div>
                          <div className="text-gray-900">
                            {Number(position.yesShares).toFixed(2)} @ ${Number(position.avgYesCost).toFixed(2)}
                          </div>
                        </div>
                      )}
                      
                      {Number(position.noShares) > 0 && (
                        <div className={`rounded p-3 ${!position.market.outcome ? 'bg-red-100 border-2 border-red-400' : 'bg-red-50'}`}>
                          <div className="text-red-700 font-semibold mb-1">
                            NO Shares {!position.market.outcome && '✓'}
                          </div>
                          <div className="text-gray-900">
                            {Number(position.noShares).toFixed(2)} @ ${Number(position.avgNoCost).toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        Market resolved: <span className="font-semibold">
                          {position.market.outcome ? 'YES' : 'NO'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Orders</h2>
          
          {orders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No orders yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Market</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Side</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Price</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Quantity</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{order.market.title}</div>
                        <div className="text-xs text-gray-500">{order.market.category}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          order.side === 'yes' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {order.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">${Number(order.price).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">{Number(order.quantity).toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          order.status === 'open' 
                            ? 'bg-blue-100 text-blue-700' 
                            : order.status === 'filled'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}