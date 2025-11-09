/*
  Warnings:

  - You are about to alter the column `title` on the `Market` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `usdcBalance` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,6)`.
  - You are about to alter the column `lockedBalance` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,6)`.
  - You are about to alter the column `fiatBalance` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,6)`.

*/
-- AlterTable
ALTER TABLE "Market" ADD COLUMN     "marketGroupId" INTEGER,
ADD COLUMN     "optionText" VARCHAR(50),
ADD COLUMN     "volume24h" DECIMAL(65,30) NOT NULL DEFAULT 0,
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "title" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "demoBalance" DECIMAL(18,6) NOT NULL DEFAULT 10000,
ADD COLUMN     "demoLockedBalance" DECIMAL(18,6) NOT NULL DEFAULT 0,
ADD COLUMN     "realLockedBalance" DECIMAL(18,6) NOT NULL DEFAULT 0,
ALTER COLUMN "usdcBalance" SET DATA TYPE DECIMAL(18,6),
ALTER COLUMN "lockedBalance" SET DATA TYPE DECIMAL(18,6),
ALTER COLUMN "fiatBalance" SET DATA TYPE DECIMAL(18,6);

-- CreateTable
CREATE TABLE "MarketGroup" (
    "id" SERIAL NOT NULL,
    "question" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "category" TEXT NOT NULL,
    "thumbnail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketGroup_category_createdAt_idx" ON "MarketGroup"("category", "createdAt");

-- CreateIndex
CREATE INDEX "Market_marketGroupId_createdAt_idx" ON "Market"("marketGroupId", "createdAt");

-- CreateIndex
CREATE INDEX "Market_category_status_volume24h_idx" ON "Market"("category", "status", "volume24h");

-- AddForeignKey
ALTER TABLE "Market" ADD CONSTRAINT "Market_marketGroupId_fkey" FOREIGN KEY ("marketGroupId") REFERENCES "MarketGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
