/*
  Warnings:

  - You are about to drop the column `duration` on the `easyweek_booking_extra` table. All the data in the column will be lost.
  - You are about to drop the column `links` on the `easyweek_booking_extra` table. All the data in the column will be lost.
  - You are about to drop the column `ordered_services` on the `easyweek_booking_extra` table. All the data in the column will be lost.
  - You are about to drop the `easyweek_booking_details` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."easyweek_booking_details" DROP CONSTRAINT "easyweek_booking_details_booking_id_fkey";

-- AlterTable
ALTER TABLE "easyweek_booking_extra" DROP COLUMN "duration",
DROP COLUMN "links",
DROP COLUMN "ordered_services";

-- DropTable
DROP TABLE "public"."easyweek_booking_details";

-- CreateTable
CREATE TABLE "easyweek_booking_links" (
    "id" UUID NOT NULL,
    "extra_id" UUID NOT NULL,
    "type" TEXT,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "easyweek_booking_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "easyweek_booking_durations" (
    "extra_id" UUID NOT NULL,
    "value" INTEGER,
    "label" TEXT,
    "iso_8601" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "easyweek_booking_durations_pkey" PRIMARY KEY ("extra_id")
);

-- CreateTable
CREATE TABLE "easyweek_ordered_services" (
    "id" UUID NOT NULL,
    "extra_id" UUID NOT NULL,
    "external_uuid" TEXT,
    "timezone" TEXT,
    "reserved_on" TIMESTAMPTZ(6),
    "reserved_until" TIMESTAMPTZ(6),
    "quantity" INTEGER,
    "name" TEXT,
    "description" TEXT,
    "currency" TEXT,
    "price" INTEGER,
    "price_formatted" TEXT,
    "discount" INTEGER,
    "discount_formatted" TEXT,
    "original_price" INTEGER,
    "original_price_formatted" TEXT,
    "duration_value" INTEGER,
    "duration_label" TEXT,
    "duration_iso" TEXT,
    "original_duration_value" INTEGER,
    "original_duration_label" TEXT,
    "original_duration_iso" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "easyweek_ordered_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "easyweek_booking_links_extra_idx" ON "easyweek_booking_links"("extra_id");

-- CreateIndex
CREATE INDEX "easyweek_ordered_services_extra_idx" ON "easyweek_ordered_services"("extra_id");

-- AddForeignKey
ALTER TABLE "easyweek_booking_links" ADD CONSTRAINT "easyweek_booking_links_extra_id_fkey" FOREIGN KEY ("extra_id") REFERENCES "easyweek_booking_extra"("booking_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "easyweek_booking_durations" ADD CONSTRAINT "easyweek_booking_durations_extra_id_fkey" FOREIGN KEY ("extra_id") REFERENCES "easyweek_booking_extra"("booking_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "easyweek_ordered_services" ADD CONSTRAINT "easyweek_ordered_services_extra_id_fkey" FOREIGN KEY ("extra_id") REFERENCES "easyweek_booking_extra"("booking_id") ON DELETE CASCADE ON UPDATE CASCADE;
