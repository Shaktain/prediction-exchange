export interface Market {
  id: number;
  title: string;
  probability: number;
  volume: string;
  endDate: string;
  category: string;
  description: string;
  totalTraders: number;
  yesPrice: number;
  noPrice: number;
  liquidity: string;
}

export const MARKETS: Market[] = [
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
  }
];

export const CATEGORIES = ['Crypto', 'Technology', 'Space', 'Politics', 'Entertainment', 'Sports', 'Climate'] as const;

export type Category = typeof CATEGORIES[number];