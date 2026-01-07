-- AlterTable
ALTER TABLE "easyweek_booking_order" ADD COLUMN     "amount_paid" INTEGER,
ADD COLUMN     "amount_paid_formatted" TEXT,
ADD COLUMN     "subtotal" INTEGER,
ADD COLUMN     "subtotal_formatted" TEXT,
ADD COLUMN     "tax" JSONB,
ADD COLUMN     "total" INTEGER,
ADD COLUMN     "total_formatted" TEXT;
