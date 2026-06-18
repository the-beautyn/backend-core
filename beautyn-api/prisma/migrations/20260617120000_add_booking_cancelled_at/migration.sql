-- AlterTable
ALTER TABLE "bookings"
  ADD COLUMN "cancelled_at" TIMESTAMPTZ(6);

-- Backfill: approximate the cancellation time of already-cancelled bookings with
-- their last-update timestamp. Going forward, new cancellations are stamped
-- exactly at the status transition by the booking handler / sync.
UPDATE "bookings"
  SET "cancelled_at" = "updated_at"
  WHERE "status" IN ('canceled', 'deleted');
