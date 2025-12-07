'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { RefreshCw, Play, Activity, CheckCircle, XCircle } from 'lucide-react';

interface BatchStatus {
  pendingTrades: number;
  isProcessing: boolean;
  batchSize: number;
  recentBatches: any[];
}

interface BatchMetrics {
  tradesProcessed: number;
  ordersInBatch: number;
  totalVolume: number;
  gasEstimate: number;
}

export default function BatchSettlementAdmin() {
  const [status, setStatus] = useState<BatchStatus | null>(null);
  const [lastMetrics, setLastMetrics] = useState<BatchMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch status on load and every 10 seconds
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/batch-settlement');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.status);
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const triggerBatchSettlement = async () => {
    setProcessing(true);
    setMessage('');

    try {
      const response = await fetch('/api/batch-settlement', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setLastMetrics(data.metrics);
        setMessage(`✅ Processed ${data.metrics.tradesProcessed} trades successfully`);
        await fetchStatus(); // Refresh status
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Batch Settlement Admin
          </h1>
          <p className="text-gray-600">
            Monitor and manage batch settlement of signed orders
          </p>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Pending Trades</h3>
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-4xl font-bold text-gray-900">
              {status?.pendingTrades ?? '-'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Waiting for settlement
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Batch Size</h3>
              <RefreshCw className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-4xl font-bold text-gray-900">
              {status?.batchSize ?? '-'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Max trades per batch
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Status</h3>
              {status?.isProcessing ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
              ) : (
                <CheckCircle className="w-6 h-6 text-green-600" />
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {status?.isProcessing ? 'Processing' : 'Ready'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Batch processor status
            </p>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Manual Settlement Control
          </h2>

          <div className="space-y-4">
            <button
              onClick={triggerBatchSettlement}
              disabled={processing || status?.isProcessing}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 disabled:transform-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {processing || status?.isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Run Batch Settlement
                </>
              )}
            </button>

            {message && (
              <div className={`p-4 rounded-lg ${
                message.startsWith('✅') 
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {message}
              </div>
            )}

            <button
              onClick={fetchStatus}
              disabled={loading}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Status
            </button>
          </div>
        </div>

        {/* Last Batch Metrics */}
        {lastMetrics && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Last Batch Results
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Trades Processed</p>
                <p className="text-3xl font-bold text-gray-900">
                  {lastMetrics.tradesProcessed}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Valid Orders</p>
                <p className="text-3xl font-bold text-green-600">
                  {lastMetrics.ordersInBatch}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Total Volume</p>
                <p className="text-3xl font-bold text-blue-600">
                  ${lastMetrics.totalVolume.toFixed(2)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Est. Gas</p>
                <p className="text-3xl font-bold text-purple-600">
                  {(lastMetrics.gasEstimate / 1000000).toFixed(2)}M
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            ℹ️ About Batch Settlement
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              <strong>Phase 1 (Current):</strong> This service collects signed orders and validates them in batches. 
              It simulates the settlement process without actually submitting to the blockchain.
            </p>
            <p>
              <strong>Phase 2 (Future):</strong> This same service will submit batches of trades to smart contracts 
              on Base/Arbitrum, settling multiple trades in a single transaction for gas efficiency.
            </p>
            <p className="pt-2">
              <strong>How it works:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Collects up to {status?.batchSize ?? 100} pending trades</li>
              <li>Validates all signatures and order data</li>
              <li>Groups trades by market for efficiency</li>
              <li>Prepares batch in smart contract format</li>
              <li>Estimates gas costs for on-chain submission</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
