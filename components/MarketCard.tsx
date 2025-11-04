'use client';
import { TrendingUp, TrendingDown, Clock, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getCategoryColor } from '@/lib/utils/market-helpers';

interface MarketCardProps {
  id: number;
  title: string;
  probability: number;
  volume: string;
  endDate: string;
  category: string;
  resolved?: boolean;
  outcome?: boolean | null;
}

export default function MarketCard({ 
  id, 
  title, 
  probability, 
  volume, 
  endDate, 
  category,
  resolved = false,
  outcome = null
}: MarketCardProps) {
  const router = useRouter();

  return (
    <div 
      onClick={() => router.push(`/market/${id}`)}
      className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
    >
      <div className="flex items-start justify-between mb-4">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(category)}`}>
          {category}
        </span>
        {!resolved ? (
          probability >= 50 ? (
            <TrendingUp className="w-5 h-5 text-green-500" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-500" />
          )
        ) : (
          outcome ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )
        )}
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-4 line-clamp-2">
        {title}
      </h3>

      <div className="space-y-3">
        {resolved ? (
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Outcome</div>
              <div className={`text-2xl font-bold ${outcome ? 'text-green-600' : 'text-red-600'}`}>
                {outcome ? 'YES' : 'NO'}
              </div>
            </div>
          </div>
        ) : (
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
        )}

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

      <button 
        disabled={resolved}
        className={`w-full py-3 rounded-lg font-semibold mt-4 transition-colors ${
          resolved 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {resolved ? 'Market Closed' : 'Trade Now'}
      </button>
    </div>
  );
}