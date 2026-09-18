-- BEA-68: denormalise the booking's client onto the row, so the owner list can show a
-- name / phone / email per booking without a clients table. From here on the booking
-- handler writes these on every create and every sync; this migration back-fills what is
-- already in the database. No CRM re-pull is needed — every source is local.

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

-- Back-fill 1/3 — Altegio. The client arrives with the record and is already stored in
-- altegio_booking_client, whose details_id chains 1:1:1 back to bookings.id. Note the
-- guard: that table always has a row (the mapper writes all-nulls when Altegio sent no
-- client), so presence of a row is not evidence of a client.
UPDATE "bookings" b
SET "client_name"   = NULLIF(TRIM(COALESCE(c."display_name", CONCAT_WS(' ', c."name", c."surname"))), ''),
    "client_phone"  = NULLIF(TRIM(c."phone"), ''),
    "client_email"  = NULLIF(TRIM(c."email"), ''),
    "client_source" = 'altegio'
FROM "altegio_booking_client" c
WHERE c."details_id" = b."id"
  AND COALESCE(c."display_name", c."name", c."surname", c."phone", c."email") IS NOT NULL;

-- Back-fill 2/3 — EasyWeek. We never mapped the customer onto a column, but the untouched
-- booking payload was always kept in crm_payload and it carries `customer`
-- (first_name / last_name / phone / email; the phone is already E.164).
UPDATE "bookings" b
SET "client_name"   = NULLIF(TRIM(CONCAT_WS(' ',
                        b."crm_payload"->'customer'->>'first_name',
                        b."crm_payload"->'customer'->>'last_name')), ''),
    "client_phone"  = NULLIF(TRIM(b."crm_payload"->'customer'->>'phone'), ''),
    "client_email"  = NULLIF(TRIM(b."crm_payload"->'customer'->>'email'), ''),
    "client_source" = 'easyweek'
WHERE b."crm_type" = 'EASYWEEK'
  AND jsonb_typeof(b."crm_payload"->'customer') = 'object';

-- Back-fill 3/3 — whatever the CRM could not supply falls back to the account that booked.
-- Only touches rows the two passes above left entirely empty.
UPDATE "bookings" b
SET "client_name"   = NULLIF(TRIM(CONCAT_WS(' ', u."name", u."second_name")), ''),
    "client_phone"  = NULLIF(TRIM(u."phone"), ''),
    "client_email"  = NULLIF(TRIM(u."email"), ''),
    "client_source" = 'user'
FROM "users" u
WHERE u."id" = b."user_id"
  AND b."client_name" IS NULL
  AND b."client_phone" IS NULL
  AND b."client_email" IS NULL;
