'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Play, Pause, RefreshCw, Activity } from 'lucide-react';

interface MarketMakerStatus {
  status: 'running' | 'stopped';
  interval: number | null;
  timestamp: string;
}

interface SyncResult {
  success: boolean;
  synced?: number;
  markets?: number;
  timestamp?: string;
  error?: string;
}

export default function MarketMakerAdmin() {
  const [status, setStatus] = useState<MarketMakerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [intervalInput, setIntervalInput] = useState('15');

  // Fetch status on load
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  async function fetchStatus() {
    try {
      const response = await fetch('/api/market-maker');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  }

  async function controlMarketMaker(action: 'start' | 'stop' | 'restart') {
    setLoading(true);
    try {
      const response = await fetch('/api/market-maker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action, 
          interval: parseInt(intervalInput) 
        })
      });
      const data = await response.json();
      await fetchStatus();
      alert(data.message);
    } catch (error) {
      console.error('Failed to control market maker:', error);
      alert('Failed to control market maker');
    } finally {
      setLoading(false);
    }
  }

  async function manualSync() {
    setLoading(true);
    setSyncResult(null);
    try {
      const response = await fetch('/api/market-maker?action=sync');
      const data = await response.json();
      setSyncResult(data);
    } catch (error) {
      console.error('Failed to sync:', error);
      setSyncResult({
        success: false,
        error: 'Failed to sync markets'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Market Maker Control</h1>
          <p className="text-gray-600">Manage the demo market liquidity mirror system</p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Status</h2>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${
              status?.status === 'running' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              <Activity className="w-5 h-5" />
              <span>{status?.status || 'Loading...'}</span>
            </div>
          </div>

          {status && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Sync Interval</div>
                <div className="text-2xl font-bold text-gray-900">
                  {status.interval ? `${status.interval}s` : 'N/A'}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Last Check</div>
                <div className="text-sm font-medium text-gray-900">
                  {new Date(status.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sync Interval (seconds)
              </label>
              <input
                type="number"
                value={intervalInput}
                onChange={(e) => setIntervalInput(e.target.value)}
                min="5"
                max="60"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => controlMarketMaker('start')}
                disabled={loading || status?.status === 'running'}
                className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-5 h-5" />
                Start
              </button>

              <button
                onClick={() => controlMarketMaker('stop')}
                disabled={loading || status?.status === 'stopped'}
                className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Pause className="w-5 h-5" />
                Stop
              </button>

              <button
                onClick={() => controlMarketMaker('restart')}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-5 h-5" />
                Restart
              </button>
            </div>
          </div>
        </div>

        {/* Manual Sync Card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Manual Sync</h2>
          <p className="text-gray-600 mb-4">
            Trigger an immediate sync of all markets from real to demo
          </p>

          <button
            onClick={manualSync}
            disabled={loading}
            className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Syncing...' : 'Sync Now'}
          </button>

          {/* Sync Result */}
          {syncResult && (
            <div className={`mt-4 p-4 rounded-lg ${
              syncResult.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {syncResult.success ? (
                <>
                  <div className="font-semibold text-green-800 mb-2">✅ Sync Successful</div>
                  <div className="text-sm text-green-700 space-y-1">
                    <div>Markets synced: {syncResult.markets}</div>
                    <div>Orders created: {syncResult.synced}</div>
                    <div>Time: {syncResult.timestamp ? new Date(syncResult.timestamp).toLocaleString() : 'N/A'}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="font-semibold text-red-800 mb-2">❌ Sync Failed</div>
                  <div className="text-sm text-red-700">{syncResult.error}</div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-6">
          <h3 className="font-bold text-blue-900 mb-2">How It Works</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• The market maker mirrors real market order books to demo mode</li>
            <li>• Demo traders see realistic liquidity matching the real market</li>
            <li>• Syncs automatically every 15 seconds (configurable)</li>
            <li>• Demo and real markets remain completely separate</li>
            <li>• All demo orders are matched against mirrored liquidity</li>
          </ul>
        </div>
      </main>
    </div>
  );
}