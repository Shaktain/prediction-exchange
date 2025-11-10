'use client';
import { use, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, TrendingDown, Users, Clock, DollarSign } from 'lucide-react';
import Header from '@/components/Header';
import { getCategoryColor } from '@/lib/utils/market-helpers';
import { useTrade } from '@/lib/hooks/useTrade';
import { useAccount } from 'wagmi';
import { useTradingMode } from '@/lib/contexts/TradingModeContext';
import OrderBook from '@/components/OrderBook';
import PriceChart from '@/components/PriceChart';

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
  const { mode, refreshBalances } = useTradingMode();
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [isTrading, setIsTrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderBookData, setOrderBookData] = useState<any>(null);

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
        let foundMarket = data.markets.find((m: any) => {
          if (m.type === 'single' && m.id === parseInt(id)) {
            return true;
          }
          // Check if this ID is an option within a market group
          if (m.type === 'group') {
            const option = m.options?.find((opt: any) => opt.id === parseInt(id));
            if (option) {
              // Transform the option into a market-like object
              return true;
            }
          }
          return false;
        });

        // If found in a market group, transform it
        if (foundMarket && foundMarket.type === 'group') {
          const option = foundMarket.options.find((opt: any) => opt.id === parseInt(id));
          if (option) {
            foundMarket = {
              id: option.id,
              title: option.optionText, // Use optionText as title
              description: foundMarket.description, // Use parent group description
              category: foundMarket.category,
              yesPrice: option.yesPrice,
              noPrice: option.noPrice,
              totalVolume: option.totalVolume || 0,
              totalLiquidity: option.totalLiquidity || 0,
              traderCount: option.traderCount || 0,
              endDate: option.endDate || new Date().toISOString()
            };
          }
        }

        setMarket(foundMarket || null);
        
        // Fetch order book
        if (foundMarket) {
          const obResponse = await fetch(`/api/orderbook?marketId=${parseInt(id)}&mode=${mode}`);
          const obData = await obResponse.json();
          setOrderBookData(obData.orderBook);
        }
      } catch (error) {
        console.error('Error fetching market:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchMarket();
  }, [id, mode]);

  // Separate polling for order book only
  useEffect(() => {
    if (!market) return;

    const interval = setInterval(async () => {
      const obResponse = await fetch(`/api/orderbook?marketId=${market.id}&mode=${mode}`);
      const obData = await obResponse.json();
      setOrderBookData(obData.orderBook);
    }, 2000);

    return () => clearInterval(interval);
  }, [market?.id, mode]);

  // Cleanup success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Helper function to register user
  const registerUser = async () => {
    const userResponse = await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: address })
    });
    if (!userResponse.ok) throw new Error('Failed to register user');
    return await userResponse.json();
  };

  // Calculate live prices from order book - UPDATED VERSION
  const getLivePrices = () => {
    if (!orderBookData) return { 
      yesPrice: '-', 
      noPrice: '-', 
      yesProbability: '-', 
      noProbability: '-',
      yesMid: '-',
      noMid: '-'
    };
    
    // Best YES bid (highest buy price)
    const yesBestBid = orderBookData.yesBids?.[0]?.price;
    // Best YES ask (lowest sell price)
    const yesBestAsk = orderBookData.yesAsks?.[orderBookData.yesAsks.length - 1]?.price;
    
    // Best NO bid (highest buy price)
    const noBestBid = orderBookData.noBids?.[0]?.price;
    // Best NO ask (lowest sell price)
    const noBestAsk = orderBookData.noAsks?.[orderBookData.noAsks.length - 1]?.price;
    
    // If buying: show ask (what you pay)
    // If selling: show bid (what you receive)
    const yesPrice = tradeType === 'buy' ? yesBestAsk : yesBestBid;
    const noPrice = tradeType === 'buy' ? noBestAsk : noBestBid;
    
    // Midpoint for probability
    const yesMid = yesBestBid && yesBestAsk ? ((yesBestBid + yesBestAsk) / 2) : (yesBestBid || yesBestAsk || null);
    const noMid = noBestBid && noBestAsk ? ((noBestBid + noBestAsk) / 2) : (noBestBid || noBestAsk || null);
    
    return {
      yesPrice: yesPrice ? `$${yesPrice.toFixed(2)}` : '-',
      noPrice: noPrice ? `$${noPrice.toFixed(2)}` : '-',
      yesProbability: yesMid ? `${Math.round(yesMid * 100)}%` : '-',
      noProbability: noMid ? `${Math.round(noMid * 100)}%` : '-',
      yesMid: yesMid ? `$${yesMid.toFixed(2)}` : '-',
      noMid: noMid ? `$${noMid.toFixed(2)}` : '-'
    };
  };

  const livePrices = getLivePrices();

  // Helper function to get current price
  const getCurrentPrice = () => {
    if (orderType === 'limit' && limitPrice) {
      return parseFloat(limitPrice);
    }
    const priceString = side === 'yes' ? livePrices.yesPrice : livePrices.noPrice;
    if (priceString === '-') {
      return side === 'yes' ? Number(market!.yesPrice) : Number(market!.noPrice);
    }
    return parseFloat(priceString.replace('$', ''));
  };

  // Validation helper
  const validateTradeInputs = () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid number of shares');
      return false;
    }

    if (orderType === 'limit') {
      if (!limitPrice || parseFloat(limitPrice) <= 0) {
        setError('Please enter a valid limit price');
        return false;
      }
      const numPrice = parseFloat(limitPrice);
      if (numPrice < 0.01 || numPrice > 0.99) {
        setError('Limit price must be between $0.01 and $0.99');
        return false;
      }
    }

    return true;
  };

  const executeBuy = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet');
      return;
    }

    if (!validateTradeInputs()) return;

    const shares = parseFloat(amount);
    const price = getCurrentPrice();

    setIsTrading(true);
    setError(null);

    try {
      const { userId } = await registerUser();

      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          marketId: market!.id,
          side,
          direction: 'buy',
          type: orderType,
          price,
          quantity: shares,
          mode
        })
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || 'Failed to place order');
      }

      setAmount('');
      setLimitPrice('');
      
      // Refresh balances to update locked amounts in header
      await refreshBalances();
      
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

    if (!validateTradeInputs()) return;

    const shares = parseFloat(amount);
    const price = getCurrentPrice();

    setIsTrading(true);
    setError(null);

    try {
      const { userId } = await registerUser();

      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          marketId: market!.id,
          side,
          direction: 'sell',
          type: orderType,
          price,
          quantity: shares,
          mode
        })
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || 'Failed to place sell order');
      }

      setAmount('');
      setLimitPrice('');
      
      // Refresh balances to update locked amounts in header
      await refreshBalances();
      
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

  const probability = livePrices.yesProbability !== '-' 
    ? parseInt(livePrices.yesProbability) 
    : Math.round(Number(market.yesPrice) * 100);
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
                  <p className="text-2xl font-bold text-gray-900">{(market.traderCount || 0).toLocaleString()}</p>
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

            <PriceChart marketId={market.id} side={side} />

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
                  <span className="text-3xl font-bold text-blue-600">{livePrices.yesProbability}</span>
                </div>
                {livePrices.yesProbability !== '-' && (
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        parseInt(livePrices.yesProbability) >= 50 ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ width: livePrices.yesProbability }}
                    />
                  </div>
                )}
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
                  <div className="text-2xl">{livePrices.yesPrice}</div>
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
                  <div className="text-2xl">{livePrices.noPrice}</div>
                </button>
              </div>

              {/* Midpoint Display */}
              <div className="text-xs text-gray-500 text-center mb-4">
                Midpoint: YES {livePrices.yesMid} | NO {livePrices.noMid}
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
                          ${(parseFloat(amount) * getCurrentPrice()).toFixed(2)} USDC
                        </span>
                      </>
                    ) : (
                      <>
                        You'll receive: <span className="font-semibold text-green-600">
                          ${(parseFloat(amount) * getCurrentPrice()).toFixed(2)} USDC
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Potential Return */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                {(() => {
                  const currentPrice = getCurrentPrice();
                  const shares = parseFloat(amount) || 0;
                  const cost = shares * currentPrice;
                  const potentialReturn = shares * 1.0;
                  const profit = potentialReturn - cost;

                  return tradeType === 'buy' ? (
                    <>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Cost</span>
                        <span className="font-bold text-gray-900">${cost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Potential Return</span>
                        <span className="font-bold text-gray-900">${potentialReturn.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Potential Profit</span>
                        <span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${profit.toFixed(2)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">You'll Receive</span>
                        <span className="font-bold text-green-600">${cost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Max Loss</span>
                        <span className="font-bold text-red-600">
                          ${(shares * (1 - currentPrice)).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Max Profit</span>
                        <span className="font-bold text-green-600">${cost.toFixed(2)}</span>
                      </div>
                    </>
                  );
                })()}
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
