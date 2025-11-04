import { Market } from '@/lib/data/markets';

export function getMarketById(id: number, markets: Market[]): Market | undefined {
  return markets.find(m => m.id === id);
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Crypto: 'bg-purple-100 text-purple-700',
    Technology: 'bg-blue-100 text-blue-700',
    Space: 'bg-indigo-100 text-indigo-700',
    Politics: 'bg-red-100 text-red-700',
    Climate: 'bg-green-100 text-green-700',
    Entertainment: 'bg-pink-100 text-pink-700',
    Sports: 'bg-orange-100 text-orange-700'
  };
  return colors[category] || 'bg-gray-100 text-gray-700';
}

export function calculatePotentialReturn(
  shares: number,
  price: number
): { shares: number; cost: number; potentialReturn: number; potentialProfit: number } {
  const cost = shares * price;
  const potentialReturn = shares * 1; // Each share pays $1 if correct
  const potentialProfit = potentialReturn - cost;
  
  return { shares, cost, potentialReturn, potentialProfit };
}