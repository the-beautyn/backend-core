/*
  Warnings:

  - You are about to drop the `easyweek_booking_extra` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."easyweek_booking_durations" DROP CONSTRAINT "easyweek_booking_durations_extra_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."easyweek_booking_extra" DROP CONSTRAINT "easyweek_booking_extra_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."easyweek_booking_links" DROP CONSTRAINT "easyweek_booking_links_extra_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."easyweek_ordered_services" DROP CONSTRAINT "easyweek_ordered_services_extra_id_fkey";

-- DropTable
DROP TABLE "public"."easyweek_booking_extra";

-- CreateTable
CREATE TABLE "easyweek_booking_details" (
    "booking_id" UUID NOT NULL,
    "order_payload" JSONB,
    "raw_payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "easyweek_booking_details_pkey" PRIMARY KEY ("booking_id")
);

-- AddForeignKey
ALTER TABLE "easyweek_booking_details" ADD CONSTRAINT "easyweek_booking_details_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "easyweek_booking_links" ADD CONSTRAINT "easyweek_booking_links_extra_id_fkey" FOREIGN KEY ("extra_id") REFERENCES "easyweek_booking_details"("booking_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "easyweek_booking_durations" ADD CONSTRAINT "easyweek_booking_durations_extra_id_fkey" FOREIGN KEY ("extra_id") REFERENCES "easyweek_booking_details"("booking_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "easyweek_ordered_services" ADD CONSTRAINT "easyweek_ordered_services_extra_id_fkey" FOREIGN KEY ("extra_id") REFERENCES "easyweek_booking_details"("booking_id") ON DELETE CASCADE ON UPDATE CASCADE;
