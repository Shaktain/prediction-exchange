-- DropForeignKey
ALTER TABLE "public"."Comment" DROP CONSTRAINT "Comment_marketId_fkey";

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "marketGroupId" INTEGER,
ALTER COLUMN "marketId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Comment_marketGroupId_idx" ON "Comment"("marketGroupId");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_marketGroupId_fkey" FOREIGN KEY ("marketGroupId") REFERENCES "MarketGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
