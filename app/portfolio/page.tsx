'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import Header from '@/components/Header';
import { TrendingUp, TrendingDown, DollarSign, Zap, Shield } from 'lucide-react';
import { useTradingMode } from '@/lib/contexts/TradingModeContext';

interface Position {
  id: string;
  marketId: number;
  yesShares: number;
  noShares: number;
  averageYesPrice: number;
  averageNoPrice: number;
  mode: string;
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
  price: number;
  quantity: number;
  status: string;
  createdAt: string;
  mode: string;
  market: {
    title: string;
    category: string;
  };
}

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { mode } = useTradingMode();
  const [userId, setUserId] = useState<number | null>(null);
  const [balance, setBalance] = useState(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'resolved'>('active');

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
        
        // Get balance based on current mode
        const balanceAmount = mode === 'demo' 
          ? Number(userData.user?.demoBalance || 0) - Number(userData.user?.demoLockedBalance || 0)
          : Number(userData.user?.usdcBalance || 0) - Number(userData.user?.realLockedBalance || 0);
        setBalance(balanceAmount);

        // Fetch positions for current mode
        const positionsResponse = await fetch(`/api/positions?userId=${userData.userId}&mode=${mode}`);
        const positionsData = await positionsResponse.json();
        setPositions(positionsData.positions || []);

        // Fetch orders for current mode
        const ordersResponse = await fetch(`/api/orders?userId=${userData.userId}&mode=${mode}`);
        const ordersData = await ordersResponse.json();
        setOrders(ordersData.orders || []);
      } catch (error) {
        console.error('Error fetching portfolio:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPortfolio();
  }, [address, isConnected, mode]);

  // Calculate P&L for a position
  const calculatePnL = (position: Position) => {
    if (position.market.resolved) {
      // Resolved market - calculate actual profit
      const outcome = position.market.outcome;
      if (outcome === true) {
        // YES won
        const profit = position.yesShares - (position.yesShares * position.averageYesPrice);
        return profit;
      } else if (outcome === false) {
        // NO won
        const profit = position.noShares - (position.noShares * position.averageNoPrice);
        return profit;
      }
      return 0;
    } else {
      // Active market - calculate unrealized P&L
      const yesPnL = position.yesShares * (position.market.yesPrice - position.averageYesPrice);
      const noPnL = position.noShares * (position.market.noPrice - position.averageNoPrice);
      return yesPnL + noPnL;
    }
  };

  // Filter positions by active/resolved
  const filteredPositions = positions.filter(position => 
    activeTab === 'active' ? !position.market.resolved : position.market.resolved
  );

  // Calculate total P&L
  const totalPnL = positions.reduce((sum, position) => sum + calculatePnL(position), 0);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
            <p className="text-gray-600">Please connect your wallet to view your portfolio.</p>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="h-32 bg-gray-200 rounded-xl"></div>
              <div className="h-32 bg-gray-200 rounded-xl"></div>
              <div className="h-32 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mode Badge */}
        <div className="mb-4">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${
            mode === 'demo' 
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' 
              : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
          }`}>
            {mode === 'demo' ? (
              <>
                <Zap className="w-5 h-5" />
                <span>Demo Portfolio - Practice Trading</span>
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                <span>Real Portfolio - Live Trading</span>
              </>
            )}
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-8">My Portfolio</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Balance Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Available Balance</span>
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              ${balance.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {mode === 'demo' ? 'Demo funds' : 'Real USDC'}
            </div>
          </div>

          {/* Total P&L Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total P&L</span>
              {totalPnL >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div className={`text-3xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {totalPnL >= 0 ? 'Profit' : 'Loss'}
            </div>
          </div>

          {/* Active Positions Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Active Positions</span>
              <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600">
                  {positions.filter(p => !p.market.resolved).length}
                </span>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {positions.filter(p => !p.market.resolved).length}
            </div>
            <div className="text-xs text-gray-500 mt-1">Open markets</div>
          </div>
        </div>

        {/* Positions Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">My Positions</h2>
            
            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('active')}
                className={`pb-3 px-1 font-semibold transition-colors ${
                  activeTab === 'active'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Active ({positions.filter(p => !p.market.resolved).length})
              </button>
              <button
                onClick={() => setActiveTab('resolved')}
                className={`pb-3 px-1 font-semibold transition-colors ${
                  activeTab === 'resolved'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Resolved ({positions.filter(p => p.market.resolved).length})
              </button>
            </div>
          </div>

          {filteredPositions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No {activeTab} positions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Market</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">YES Shares</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">NO Shares</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg Price</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Current Price</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPositions.map((position) => {
                    const pnl = calculatePnL(position);
                    return (
                      <tr key={position.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{position.market.title}</div>
                          <div className="text-xs text-gray-500">{position.market.category}</div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {position.yesShares > 0 ? (
                            <span className="text-green-600 font-medium">
                              {Number(position.yesShares).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {position.noShares > 0 ? (
                            <span className="text-red-600 font-medium">
                              {Number(position.noShares).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-gray-600">
                          {position.yesShares > 0 && `$${Number(position.averageYesPrice).toFixed(2)}`}
                          {position.noShares > 0 && `$${Number(position.averageNoPrice).toFixed(2)}`}
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-gray-600">
                          {!position.market.resolved ? (
                            <>
                              {position.yesShares > 0 && `$${Number(position.market.yesPrice).toFixed(2)}`}
                              {position.noShares > 0 && `$${Number(position.market.noPrice).toFixed(2)}`}
                            </>
                          ) : (
                            <span className="font-semibold">
                              {position.market.outcome ? 'YES' : 'NO'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-semibold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Orders Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">My Orders</h2>
          </div>

          {orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
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