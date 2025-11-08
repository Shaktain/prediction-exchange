'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Plus, TrendingUp, CheckCircle, Users, DollarSign } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [markets, setMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const response = await fetch('/api/markets');
      const data = await response.json();
      setMarkets(data.markets || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate stats
  const activeCount = markets.filter(m => {
    if (m.type === 'single') return !m.resolved;
    return m.options?.some((opt: any) => !opt.resolved);
  }).length;

  const resolvedCount = markets.filter(m => {
    if (m.type === 'single') return m.resolved;
    return m.options?.every((opt: any) => opt.resolved);
  }).length;

  const totalVolume = markets.reduce((sum, m) => sum + Number(m.totalVolume || 0), 0);
  const totalTraders = markets.reduce((sum, m) => sum + Number(m.traderCount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
          <button
            onClick={() => router.push('/admin/markets')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            Create Market
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span>Active Markets</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{activeCount}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <CheckCircle className="w-4 h-4" />
              <span>Resolved Markets</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{resolvedCount}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <DollarSign className="w-4 h-4" />
              <span>Total Volume</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              ${(totalVolume / 1000).toFixed(1)}K
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Users className="w-4 h-4" />
              <span>Total Traders</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalTraders}</p>
          </div>
        </div>

        {/* Markets Table */}
        <div className="bg-white rounded-xl shadow-md p-6">
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
          ) : markets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No markets yet. Create your first market!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Market</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Volume</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Traders</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">End Date</th>
                  </tr>
                </thead>
                <tbody>
                  {markets.map((market) => {
                    const isResolved = market.type === 'single' 
                      ? market.resolved 
                      : market.options?.every((opt: any) => opt.resolved);
                    
                    const displayName = market.type === 'single' 
                      ? market.title 
                      : market.question;

                    const optionCount = market.type === 'group' 
                      ? market.options?.length || 0 
                      : null;

                    return (
                      <tr key={`${market.type}-${market.id}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{displayName}</div>
                          <div className="text-sm text-gray-500">{market.category}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600">
                            {market.type === 'single' ? 'Single' : `Multi (${optionCount})`}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            isResolved
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {isResolved ? 'Resolved' : 'Active'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-900">
                          ${(Number(market.totalVolume || 0) / 1000).toFixed(1)}K
                        </td>
                        <td className="py-3 px-4 text-gray-900">
                          {market.traderCount || 0}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {market.endDate ? new Date(market.endDate).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}