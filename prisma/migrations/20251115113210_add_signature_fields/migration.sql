-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "expiration" TIMESTAMP(3),
ADD COLUMN     "nonce" BIGINT,
ADD COLUMN     "signature" TEXT;

-- CreateIndex
CREATE INDEX "Order_signature_idx" ON "Order"("signature");

-- CreateIndex
CREATE INDEX "Order_expiration_idx" ON "Order"("expiration");

-- CreateIndex
CREATE INDEX "Order_nonce_idx" ON "Order"("nonce");
