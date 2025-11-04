import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting migration...\n');

  try {
    const orderCount = await prisma.order.count();
    const tradeCount = await prisma.trade.count();
    const positionCount = await prisma.position.count();

    console.log('📊 Current database:');
    console.log(`   Orders: ${orderCount}`);
    console.log(`   Trades: ${tradeCount}`);
    console.log(`   Positions: ${positionCount}\n`);

    if (orderCount === 0 && tradeCount === 0 && positionCount === 0) {
      console.log('✅ Database is clean. No migration needed.');
      return;
    }

    console.log('🗑️  Deleting existing data...');

    await prisma.trade.deleteMany({});
    console.log(`   ✓ Deleted trades`);

    await prisma.order.deleteMany({});
    console.log(`   ✓ Deleted orders`);

    await prisma.position.deleteMany({});
    console.log(`   ✓ Deleted positions`);

    await prisma.user.updateMany({
      data: { lockedBalance: 0 }
    });
    console.log(`   ✓ Reset locked balances\n`);

    console.log('✅ Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });