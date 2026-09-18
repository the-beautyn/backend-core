-- BEA-68: denormalise the booking's client onto the row, so the owner list can show a
-- name / phone / email per booking without a clients table. The booking handler writes
-- these on every create and every sync from here on.
--
-- Schema only. The back-fill for existing rows lives in
-- scripts/backfill-booking-client.ts and is run separately:
--
--     npm run backfill:client:local      (or :dev / :stage / :prod)
--
-- Deliberately not SQL. The snapshot depends on libphonenumber's validity check —
-- "380950000001" must gain a leading + while "123456" must not, and no regex tells
-- those apart — so a SQL back-fill drifts from what the sync writes. Running the same
-- TypeScript the handler uses is the only way the two agree.

-- AlterTable
ALTER TABLE "bookings"
  ADD COLUMN "client_name"   TEXT,
  ADD COLUMN "client_phone"  VARCHAR(30),
  ADD COLUMN "client_email"  TEXT,
  ADD COLUMN "client_source" TEXT;

-- CreateIndex
-- The owner list orders by datetime desc within a salon, and now also counts over that
-- same filter to return `total`. Without this both are a salon-wide scan.
CREATE INDEX "bookings_salon_datetime_idx" ON "bookings" ("salon_id", "datetime" DESC);
