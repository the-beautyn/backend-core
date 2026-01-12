-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "booking_history" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "synced_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remote_updated_at" TEXT,
    "payload" JSONB NOT NULL,
    "diff_from_prev" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "booking_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_history_booking_version_idx" ON "booking_history"("booking_id", "version");

-- AddForeignKey
ALTER TABLE "booking_history" ADD CONSTRAINT "booking_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
