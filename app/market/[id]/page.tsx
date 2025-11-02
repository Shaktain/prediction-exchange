'use client';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, TrendingDown, Users, Clock, DollarSign } from 'lucide-react';
import Header from '@/components/Header';

// Same markets data (we'll move this to a separate file later)
const markets = [
  {
    id: 1,
    title: 'Will Bitcoin close above $80,000 by December 31, 2025?',
    probability: 75,
    volume: '$124.5K',
    endDate: 'Dec 31, 2025',
    category: 'Crypto',
    description: 'This market resolves to YES if Bitcoin (BTC) closes above $80,000 on December 31, 2025, based on CoinGecko pricing data.',
    totalTraders: 1247,
    yesPrice: 0.75,
    noPrice: 0.25,
    liquidity: '$124.5K'
  },
  {
    id: 2,
    title: 'Will Ethereum reach $5,000 by end of 2025?',
    probability: 62,
    volume: '$89.2K',
    endDate: 'Dec 31, 2025',
    category: 'Crypto',
    description: 'This market resolves to YES if Ethereum (ETH) reaches or exceeds $5,000 at any point before December 31, 2025.',
    totalTraders: 892,
    yesPrice: 0.62,
    noPrice: 0.38,
    liquidity: '$89.2K'
  },
  {
    id: 3,
    title: 'Will AI replace 50% of coding jobs by 2030?',
    probability: 38,
    volume: '$56.8K',
    endDate: 'Jan 1, 2030',
    category: 'Technology',
    description: 'This market resolves to YES if credible employment data shows that AI has replaced at least 50% of traditional software development jobs by 2030.',
    totalTraders: 634,
    yesPrice: 0.38,
    noPrice: 0.62,
    liquidity: '$56.8K'
  },
  {
    id: 4,
    title: 'Will SpaceX land humans on Mars by 2030?',
    probability: 45,
    volume: '$203.4K',
    endDate: 'Dec 31, 2030',
    category: 'Space',
    description: 'This market resolves to YES if SpaceX successfully lands humans on Mars before December 31, 2030.',
    totalTraders: 2156,
    yesPrice: 0.45,
    noPrice: 0.55,
    liquidity: '$203.4K'
  },
  {
    id: 5,
    title: 'Will Trump win the 2024 US Presidential Election?',
    probability: 52,
    volume: '$1.2M',
    endDate: 'Nov 5, 2024',
    category: 'Politics',
    description: 'This market resolves to YES if Donald Trump wins the 2024 US Presidential Election.',
    totalTraders: 5432,
    yesPrice: 0.52,
    noPrice: 0.48,
    liquidity: '$1.2M'
  },
  {
    id: 6,
    title: 'Will global temperatures rise by 1.5°C by 2030?',
    probability: 68,
    volume: '$78.3K',
    endDate: 'Dec 31, 2030',
    category: 'Climate',
    description: 'This market resolves to YES if global average temperatures rise by 1.5°C above pre-industrial levels by 2030.',
    totalTraders: 876,
    yesPrice: 0.68,
    noPrice: 0.32,
    liquidity: '$78.3K'
  },
  {
    id: 7,
    title: 'Will the next GTA game release before 2026?',
    probability: 34,
    volume: '$145.7K',
    endDate: 'Dec 31, 2025',
    category: 'Entertainment',
    description: 'This market resolves to YES if Rockstar Games officially releases GTA VI before December 31, 2025.',
    totalTraders: 1823,
    yesPrice: 0.34,
    noPrice: 0.66,
    liquidity: '$145.7K'
  },
  {
    id: 8,
    title: 'Will Lionel Messi win another Ballon d\'Or before retirement?',
    probability: 28,
    volume: '$92.3K',
    endDate: 'Dec 31, 2026',
    category: 'Sports',
    description: 'This market resolves to YES if Lionel Messi wins the Ballon d\'Or award before his official retirement from professional football.',
    totalTraders: 1045,
    yesPrice: 0.28,
    noPrice: 0.72,
    liquidity: '$92.3K'
  },
  {
    id: 9,
    title: 'Will Apple release AR glasses by 2026?',
    probability: 55,
    volume: '$167.9K',
    endDate: 'Dec 31, 2026',
    category: 'Technology',
    description: 'This market resolves to YES if Apple officially releases consumer AR glasses before December 31, 2026.',
    totalTraders: 1567,
    yesPrice: 0.55,
    noPrice: 0.45,
    liquidity: '$167.9K'
  },
  {
    id: 10,
    title: 'Will any country ban TikTok nationwide by end of 2025?',
    probability: 71,
    volume: '$234.1K',
    endDate: 'Dec 31, 2025',
    category: 'Politics',
    description: 'This market resolves to YES if any country implements a complete nationwide ban on TikTok before December 31, 2025.',
    totalTraders: 2341,
    yesPrice: 0.71,
    noPrice: 0.29,
    liquidity: '$234.1K'
  },
  {
    id: 11,
    title: 'Will the Olympics add esports as an official event by 2028?',
    probability: 42,
    volume: '$78.5K',
    endDate: 'Jul 14, 2028',
    category: 'Sports',
    description: 'This market resolves to YES if the International Olympic Committee officially adds esports as a medal event for the 2028 Olympics.',
    totalTraders: 723,
    yesPrice: 0.42,
    noPrice: 0.58,
    liquidity: '$78.5K'
  },
  {
    id: 12,
    title: 'Will Netflix subscriber count exceed 300M by 2026?',
    probability: 59,
    volume: '$112.6K',
    endDate: 'Dec 31, 2026',
    category: 'Entertainment',
    description: 'This market resolves to YES if Netflix reports more than 300 million subscribers by December 31, 2026.',
    totalTraders: 1134,
    yesPrice: 0.59,
    noPrice: 0.41,
    liquidity: '$112.6K'
  }
];

export default function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const market = markets.find(m => m.id === parseInt(id));

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

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      Crypto: 'bg-purple-100 text-purple-700',
      Technology: 'bg-blue-100 text-blue-700',
      Space: 'bg-indigo-100 text-indigo-700',
      Politics: 'bg-red-100 text-red-700',
      Climate: 'bg-green-100 text-green-700',
      Entertainment: 'bg-pink-100 text-pink-700',
      Sports: 'bg-orange-100 text-orange-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Markets
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Market Header */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-start justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getCategoryColor(market.category)}`}>
                  {market.category}
                </span>
                {market.probability >= 50 ? (
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

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center text-gray-500 mb-1">
                    <Users className="w-4 h-4 mr-1" />
                    <span className="text-sm">Traders</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{market.totalTraders.toLocaleString()}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center text-gray-500 mb-1">
                    <DollarSign className="w-4 h-4 mr-1" />
                    <span className="text-sm">Volume</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{market.volume}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center text-gray-500 mb-1">
                    <DollarSign className="w-4 h-4 mr-1" />
                    <span className="text-sm">Liquidity</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{market.liquidity}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center text-gray-500 mb-1">
                    <Clock className="w-4 h-4 mr-1" />
                    <span className="text-sm">Ends</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{market.endDate}</p>
                </div>
              </div>
            </div>

            {/* Probability Chart Placeholder */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Probability Over Time</h2>
              <div className="h-64 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Chart will be implemented with recharts</p>
              </div>
            </div>
          </div>

          {/* Trading Panel - Right Side */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Trade</h2>

              {/* Current Probability */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Current Probability</span>
                  <span className="text-3xl font-bold text-blue-600">{market.probability}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      market.probability >= 50 ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${market.probability}%` }}
                  />
                </div>
              </div>

              {/* Yes/No Buttons */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-lg transition-colors">
                  <div className="text-sm mb-1">YES</div>
                  <div className="text-2xl">${market.yesPrice.toFixed(2)}</div>
                </button>
                <button className="bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-6 rounded-lg transition-colors">
                  <div className="text-sm mb-1">NO</div>
                  <div className="text-2xl">${market.noPrice.toFixed(2)}</div>
                </button>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  Amount (USDC)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Potential Return */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Potential Return</span>
                  <span className="font-bold text-gray-900">$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Potential Profit</span>
                  <span className="font-bold text-green-600">$0.00</span>
                </div>
              </div>

              {/* Place Trade Button */}
              <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105">
                Connect Wallet to Trade
              </button>

              {/* Info Text */}
              <p className="text-xs text-gray-500 text-center mt-4">
                Trades are executed on Base blockchain using USDC
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}