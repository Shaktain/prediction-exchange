/*
  Warnings:

  - You are about to alter the column `yesShares` on the `Position` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,6)`.
  - You are about to alter the column `noShares` on the `Position` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,6)`.
  - You are about to alter the column `avgYesCost` on the `Position` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,6)`.
  - You are about to alter the column `avgNoCost` on the `Position` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,6)`.
  - You are about to alter the column `realizedPnL` on the `Position` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,6)`.
  - You are about to alter the column `price` on the `Trade` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,6)`.
  - You are about to alter the column `quantity` on the `Trade` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,6)`.
  - A unique constraint covering the columns `[userId,marketId,mode]` on the table `Position` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."Trade" DROP CONSTRAINT "Trade_buyOrderId_fkey";

-- DropIndex
DROP INDEX "public"."Order_marketId_status_side_direction_price_createdAt_idx";

-- DropIndex
DROP INDEX "public"."Order_userId_idx";

-- DropIndex
DROP INDEX "public"."Position_userId_marketId_key";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'demo',
ALTER COLUMN "price" SET DATA TYPE DECIMAL(18,6),
ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'demo',
ALTER COLUMN "yesShares" SET DATA TYPE DECIMAL(18,6),
ALTER COLUMN "noShares" SET DATA TYPE DECIMAL(18,6),
ALTER COLUMN "avgYesCost" SET DATA TYPE DECIMAL(18,6),
ALTER COLUMN "avgNoCost" SET DATA TYPE DECIMAL(18,6),
ALTER COLUMN "realizedPnL" SET DATA TYPE DECIMAL(18,6);

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'demo',
ALTER COLUMN "price" SET DATA TYPE DECIMAL(18,6),
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(18,6);

-- CreateIndex
CREATE INDEX "Order_marketId_side_direction_status_mode_idx" ON "Order"("marketId", "side", "direction", "status", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "Position_userId_marketId_mode_key" ON "Position"("userId", "marketId", "mode");

-- CreateIndex
CREATE INDEX "Trade_marketId_mode_idx" ON "Trade"("marketId", "mode");

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_sellerUserId_fkey" FOREIGN KEY ("sellerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
