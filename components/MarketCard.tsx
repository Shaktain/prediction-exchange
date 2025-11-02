'use client';
import { TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MarketCardProps {
  id: number;
  title: string;
  probability: number;
  volume: string;
  endDate: string;
  category: string;
}

export default function MarketCard({ id, title, probability, volume, endDate, category }: MarketCardProps) {
  const router = useRouter();

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
    <div 
      onClick={() => router.push(`/market/${id}`)}
      className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
    >
      <div className="flex items-start justify-between mb-4">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(category)}`}>
          {category}
        </span>
        {probability >= 50 ? (
          <TrendingUp className="w-5 h-5 text-green-500" />
        ) : (
          <TrendingDown className="w-5 h-5 text-red-500" />
        )}
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-4 line-clamp-2">
        {title}
      </h3>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Probability</span>
            <span className="text-lg font-bold text-gray-900">{probability}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                probability >= 50 ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{ width: `${probability}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between text-sm">
          <div className="flex items-center text-gray-600">
            <DollarSign className="w-4 h-4 mr-1" />
            <span>Volume: {volume}</span>
          </div>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <Clock className="w-4 h-4 mr-1" />
          <span>Ends: {endDate}</span>
        </div>
      </div>

      <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold mt-4 hover:bg-blue-700 transition-colors">
        Trade Now
      </button>
    </div>
  );
}