import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create sample markets
  const markets = [
    {
      title: 'Will Bitcoin close above $80,000 by December 31, 2025?',
      description: 'This market resolves to YES if Bitcoin (BTC) closes above $80,000 on December 31, 2025, based on CoinGecko pricing data.',
      category: 'Crypto',
      yesPrice: 0.75,
      noPrice: 0.25,
      endDate: new Date('2025-12-31'),
      totalVolume: 124500,
      totalLiquidity: 124500,
      traderCount: 1247
    },
    {
      title: 'Will Ethereum reach $5,000 by end of 2025?',
      description: 'This market resolves to YES if Ethereum (ETH) reaches or exceeds $5,000 at any point before December 31, 2025.',
      category: 'Crypto',
      yesPrice: 0.62,
      noPrice: 0.38,
      endDate: new Date('2025-12-31'),
      totalVolume: 89200,
      totalLiquidity: 89200,
      traderCount: 892
    },
    {
      title: 'Will AI replace 50% of coding jobs by 2030?',
      description: 'This market resolves to YES if credible employment data shows that AI has replaced at least 50% of traditional software development jobs by 2030.',
      category: 'Technology',
      yesPrice: 0.38,
      noPrice: 0.62,
      endDate: new Date('2030-01-01'),
      totalVolume: 56800,
      totalLiquidity: 56800,
      traderCount: 634
    },
    {
      title: 'Will SpaceX land humans on Mars by 2030?',
      description: 'This market resolves to YES if SpaceX successfully lands humans on Mars before December 31, 2030.',
      category: 'Space',
      yesPrice: 0.45,
      noPrice: 0.55,
      endDate: new Date('2030-12-31'),
      totalVolume: 203400,
      totalLiquidity: 203400,
      traderCount: 2156
    }
  ];

  for (const market of markets) {
    await prisma.market.create({
      data: market
    });
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });