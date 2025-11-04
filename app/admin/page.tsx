'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { TrendingUp, Plus, CheckCircle, Users, DollarSign } from 'lucide-react';

interface Market {
  id: number;
  title: string;
  category: string;
  status: string;
  resolved: boolean;
  totalVolume: number;
  traderCount: number;
  endDate: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarkets();
    // Auto-refresh every 10 seconds
  const interval = setInterval(fetchMarkets, 5000);

  return () => clearInterval(interval);
  }, []);

  async function fetchMarkets() {
    try {
      const response = await fetch('/api/markets');
      const data = await response.json();
      //Filter out resolved markets
      const activeMarkets = data.markets.filter((m: any) => !m.resolved);
      setMarkets(activeMarkets);
    } catch (error) {
      console.error('Error fetching markets:', error);
    } finally {
      setLoading(false);
    }
  }

  const activeMarkets = markets.filter(m => !m.resolved);
  const resolvedMarkets = markets.filter(m => m.resolved);
  const totalVolume = markets.reduce((sum, m) => sum + Number(m.totalVolume), 0);
  const totalTraders = markets.reduce((sum, m) => sum + m.traderCount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
          <button
            onClick={() => router.push('/admin/markets')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            Create Market
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center text-gray-500 mb-2">
              <TrendingUp className="w-5 h-5 mr-2" />
              <span className="text-sm font-semibold">Active Markets</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{activeMarkets.length}</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center text-gray-500 mb-2">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span className="text-sm font-semibold">Resolved Markets</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{resolvedMarkets.length}</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center text-gray-500 mb-2">
              <DollarSign className="w-5 h-5 mr-2" />
              <span className="text-sm font-semibold">Total Volume</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              ${(totalVolume / 1000).toFixed(0)}K
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center text-gray-500 mb-2">
              <Users className="w-5 h-5 mr-2" />
              <span className="text-sm font-semibold">Total Traders</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalTraders}</p>
          </div>
        </div>

        {/* Markets List */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">All Markets</h2>
            <button
              onClick={() => router.push('/admin/resolution')}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Resolve Markets →
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Market</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Volume</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Traders</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">End Date</th>
                  </tr>
                </thead>
                <tbody>
                  {markets.map((market) => (
                    <tr key={market.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{market.title}</div>
                        <div className="text-xs text-gray-500">{market.category}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          market.resolved
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {market.resolved ? 'Resolved' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        ${(Number(market.totalVolume) / 1000).toFixed(1)}K
                      </td>
                      <td className="py-3 px-4 text-right">{market.traderCount}</td>
                      <td className="py-3 px-4 text-right text-sm text-gray-500">
                        {new Date(market.endDate).toLocaleDateString()}
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