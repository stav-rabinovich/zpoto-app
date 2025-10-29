-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "licensePlate" TEXT;
ALTER TABLE "Booking" ADD COLUMN "paidAt" DATETIME;
ALTER TABLE "Booking" ADD COLUMN "paymentId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "Booking" ADD COLUMN "paymentStatus" TEXT DEFAULT 'PENDING';
ALTER TABLE "Booking" ADD COLUMN "vehicleDescription" TEXT;
ALTER TABLE "Booking" ADD COLUMN "vehicleId" INTEGER;

-- CreateIndex
CREATE INDEX "Booking_paymentStatus_idx" ON "Booking"("paymentStatus");
