/*
  Warnings:

  - You are about to drop the column `order_payload` on the `easyweek_booking_details` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "easyweek_booking_details" DROP COLUMN "order_payload";

-- CreateTable
CREATE TABLE "easyweek_booking_order" (
    "booking_id" UUID NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "easyweek_booking_order_pkey" PRIMARY KEY ("booking_id")
);

-- AddForeignKey
ALTER TABLE "easyweek_booking_order" ADD CONSTRAINT "easyweek_booking_order_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "easyweek_booking_details"("booking_id") ON DELETE CASCADE ON UPDATE CASCADE;
