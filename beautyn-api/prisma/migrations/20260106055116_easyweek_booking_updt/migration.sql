/*
  Warnings:

  - A unique constraint covering the columns `[crm_type,crm_record_id]` on the table `bookings` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "crm_payload" JSONB,
ADD COLUMN     "crm_type" TEXT,
ADD COLUMN     "end_datetime" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "services_salon_crm_id_idx" ON "services"("salon_id", "crm_service_id");

-- CreateTable
CREATE TABLE "easyweek_booking_details" (
    "booking_id" UUID NOT NULL,
    "booking_uuid" TEXT NOT NULL,
    "salon_id" UUID NOT NULL,
    "location_uuid" TEXT,
    "start_time" TIMESTAMPTZ(6),
    "end_time" TIMESTAMPTZ(6),
    "timezone" TEXT,
    "is_canceled" BOOLEAN,
    "is_completed" BOOLEAN,
    "status" TEXT,
    "ordered_services" JSONB,
    "order_payload" JSONB,
    "policy" JSONB,
    "links" JSONB,
    "raw_payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "easyweek_booking_details_pkey" PRIMARY KEY ("booking_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "easyweek_booking_details_uuid_unique" ON "easyweek_booking_details"("booking_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_crm_type_record_unique" ON "bookings"("crm_type", "crm_record_id");

-- AddForeignKey
ALTER TABLE "easyweek_booking_details" ADD CONSTRAINT "easyweek_booking_details_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
