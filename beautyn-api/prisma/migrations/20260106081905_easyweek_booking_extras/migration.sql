-- CreateTable
CREATE TABLE "easyweek_booking_extra" (
    "booking_id" UUID NOT NULL,
    "links" JSONB,
    "order_payload" JSONB,
    "duration" JSONB,
    "ordered_services" JSONB,
    "raw_payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "easyweek_booking_extra_pkey" PRIMARY KEY ("booking_id")
);

-- AddForeignKey
ALTER TABLE "easyweek_booking_extra" ADD CONSTRAINT "easyweek_booking_extra_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
