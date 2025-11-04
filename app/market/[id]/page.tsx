'use client';
import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, TrendingDown, Users, Clock, DollarSign } from 'lucide-react';
import Header from '@/components/Header';
import { getCategoryColor } from '@/lib/utils/market-helpers';
import { useTrade } from '@/lib/hooks/useTrade';
import { useAccount } from 'wagmi';
import OrderBook from '@/components/OrderBook';

interface Market {
  id: number;
  title: string;
  description: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  totalVolume: number;
  totalLiquidity: number;
  traderCount: number;
  endDate: string;
}

export default function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [isTrading, setIsTrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    amount,
    setAmount,
    side,
    setSide,
    executeTrade,
    potentialReturn
  } = useTrade(
    market ? market.id : 0,
    market ? Number(market.yesPrice) : 0.5,
    market ? Number(market.noPrice) : 0.5
  );

  useEffect(() => {
    async function fetchMarket() {
      try {
        const response = await fetch('/api/markets');
        const data = await response.json();
        const foundMarket = data.markets.find((m: Market) => m.id === parseInt(id));
        setMarket(foundMarket || null);
      } catch (error) {
        console.error('Error fetching market:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchMarket();
  }, [id]);

  const executeBuy = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid number of shares');
      return;
    }

    if (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      setError('Please enter a valid limit price');
      return;
    }

    const shares = parseFloat(amount);
    const price = orderType === 'limit' 
      ? parseFloat(limitPrice) 
      : (side === 'yes' ? Number(market!.yesPrice) : Number(market!.noPrice));

    setIsTrading(true);
    setError(null);

    try {
      const userResponse = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });

      if (!userResponse.ok) {
        throw new Error('Failed to register user');
      }

      const { userId } = await userResponse.json();

      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          marketId: market!.id,
          side,
          type: orderType,
          price,
          quantity: shares
        })
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || 'Failed to place order');
      }

      setAmount('');
      setLimitPrice('');
    } catch (err: any) {
      console.error('Buy error:', err);
      setError(err.message || 'Failed to execute buy');
      throw err;
    } finally {
      setIsTrading(false);
    }
  };

  const executeSell = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid number of shares');
      return;
    }

    if (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      setError('Please enter a valid limit price');
      return;
    }

    const shares = parseFloat(amount);
    const basePrice = side === 'yes' ? Number(market!.yesPrice) : Number(market!.noPrice);
    const price = orderType === 'limit' ? parseFloat(limitPrice) : basePrice;

    setIsTrading(true);
    setError(null);

    try {
      const userResponse = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });

      if (!userResponse.ok) {
        throw new Error('Failed to register user');
      }

      const { userId } = await userResponse.json();

      const sellSide = side === 'yes' ? 'no' : 'yes';
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          marketId: market!.id,
          side: sellSide,
          type: orderType,
          price: orderType === 'limit' ? price : (1 - price),
          quantity: shares
        })
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || 'Failed to place sell order');
      }

      setAmount('');
      setLimitPrice('');
    } catch (err: any) {
      console.error('Sell error:', err);
      setError(err.message || 'Failed to execute sell');
      throw err;
    } finally {
      setIsTrading(false);
    }
  };

  const handleTrade = async () => {
    try {
      if (tradeType === 'sell') {
        await executeSell();
      } else {
        await executeBuy();
      }
      setSuccessMessage(`${orderType === 'limit' ? 'Limit' : 'Market'} ${tradeType === 'buy' ? 'order' : 'sale'} placed successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      // Error already handled in functions
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 mt-4">Loading market...</p>
        </div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Market Not Found</h1>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            ← Back to Markets
          </button>
        </div>
      </div>
    );
  }

  const probability = Math.round(Number(market.yesPrice) * 100);
  const volume = `$${(Number(market.totalVolume) / 1000).toFixed(1)}K`;
  const liquidity = `$${(Number(market.totalLiquidity) / 1000).toFixed(1)}K`;
  const endDate = new Date(market.endDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push('/')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Markets
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-start justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getCategoryColor(market.category)}`}>
                  {market.category}
                </span>
                {probability >= 50 ? (
                  <TrendingUp className="w-6 h-6 text-green-500" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-500" />
                )}
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {market.title}
              </h1>

              <p className="text-gray-600 text-lg mb-6">
                {market.description}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center text-gray-500 mb-1">
                    <Users className="w-4 h-4 mr-1" />
                    <span className="text-sm">Traders</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{market.traderCount.toLocaleString()}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center text-gray-500 mb-1">
                    <DollarSign className="w-4 h-4 mr-1" />
                    <span className="text-sm">Volume</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{volume}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center text-gray-500 mb-1">
                    <DollarSign className="w-4 h-4 mr-1" />
                    <span className="text-sm">Liquidity</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{liquidity}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center text-gray-500 mb-1">
                    <Clock className="w-4 h-4 mr-1" />
                    <span className="text-sm">Ends</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{endDate}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Probability Over Time</h2>
              <div className="h-64 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Chart coming soon</p>
              </div>
            </div>

            {/* Order Book */}
            <OrderBook marketId={market.id} />
          </div>

          {/* Trading Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Trade</h2>

              {/* Success Message */}
              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
                  {successMessage}
                </div>
              )}

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Current Probability</span>
                  <span className="text-3xl font-bold text-blue-600">{probability}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      probability >= 50 ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${probability}%` }}
                  />
                </div>
              </div>

              {/* Buy/Sell Toggle */}
              <div className="grid grid-cols-2 gap-2 mb-6">
                <button
                  onClick={() => setTradeType('buy')}
                  disabled={isTrading}
                  className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                    tradeType === 'buy'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setTradeType('sell')}
                  disabled={isTrading}
                  className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                    tradeType === 'sell'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Sell
                </button>
              </div>

              {/* Order Type Toggle */}
              <div className="grid grid-cols-2 gap-2 mb-6">
                <button
                  onClick={() => setOrderType('market')}
                  disabled={isTrading}
                  className={`py-2 px-4 rounded-lg font-semibold transition-all text-sm ${
                    orderType === 'market'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Market Order
                </button>
                <button
                  onClick={() => setOrderType('limit')}
                  disabled={isTrading}
                  className={`py-2 px-4 rounded-lg font-semibold transition-all text-sm ${
                    orderType === 'limit'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Limit Order
                </button>
              </div>

              {/* Yes/No Buttons */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setSide('yes')}
                  disabled={isTrading}
                  className={`font-bold py-4 px-6 rounded-lg transition-all ${
                    side === 'yes'
                      ? 'bg-green-500 text-white ring-4 ring-green-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="text-sm mb-1">YES</div>
                  <div className="text-2xl">${Number(market.yesPrice).toFixed(2)}</div>
                </button>
                <button
                  onClick={() => setSide('no')}
                  disabled={isTrading}
                  className={`font-bold py-4 px-6 rounded-lg transition-all ${
                    side === 'no'
                      ? 'bg-red-500 text-white ring-4 ring-red-200'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="text-sm mb-1">NO</div>
                  <div className="text-2xl">${Number(market.noPrice).toFixed(2)}</div>
                </button>
              </div>

              {/* Limit Price Input */}
              {orderType === 'limit' && (
                <div className="mb-6">
                  <label className="block text-gray-700 font-semibold mb-2">
                    Limit Price (per share)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="0.99"
                    placeholder="0.50"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    disabled={isTrading}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your order will only execute at this price or better
                  </p>
                </div>
              )}

              {/* Number of Shares Input */}
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  Number of Shares
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isTrading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
                {amount && parseFloat(amount) > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    {tradeType === 'buy' ? (
                      <>
                        Cost: <span className="font-semibold text-gray-900">
                          ${(parseFloat(amount) * (orderType === 'limit' ? (limitPrice ? parseFloat(limitPrice) : 0) : (side === 'yes' ? Number(market.yesPrice) : Number(market.noPrice)))).toFixed(2)} USDC
                        </span>
                      </>
                    ) : (
                      <>
                        You'll receive: <span className="font-semibold text-green-600">
                          ${(parseFloat(amount) * (orderType === 'limit' ? (limitPrice ? parseFloat(limitPrice) : 0) : (side === 'yes' ? Number(market.yesPrice) : Number(market.noPrice)))).toFixed(2)} USDC
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Potential Return */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                {tradeType === 'buy' ? (
                  <>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Cost</span>
                      <span className="font-bold text-gray-900">${potentialReturn.cost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Potential Return</span>
                      <span className="font-bold text-gray-900">${potentialReturn.potentialReturn.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Potential Profit</span>
                      <span className={`font-bold ${potentialReturn.potentialProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${potentialReturn.potentialProfit.toFixed(2)}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">You'll Receive</span>
                      <span className="font-bold text-green-600">${potentialReturn.cost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Max Loss</span>
                      <span className="font-bold text-red-600">
                        ${(potentialReturn.potentialReturn - potentialReturn.cost).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Profit</span>
                      <span className="font-bold text-green-600">${potentialReturn.cost.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}

              {/* Place Trade Button */}
              <button
                onClick={handleTrade}
                disabled={!isConnected || isTrading || !amount || parseFloat(amount) <= 0 || (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0))}
                className={`w-full font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed ${
                  tradeType === 'buy'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white'
                    : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 text-white'
                }`}
              >
                {!isConnected 
                  ? 'Connect Wallet to Trade'
                  : isTrading
                  ? 'Processing...'
                  : `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${side.toUpperCase()} Shares`
                }
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                {tradeType === 'buy' 
                  ? orderType === 'limit' 
                    ? 'Limit order will execute at your price or better'
                    : 'Market order will execute immediately at current price'
                  : 'Sell shares to receive cash now, with obligation to pay if you\'re wrong'
                }
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}