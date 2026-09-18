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
--
-- Two details mirror the runtime mapping in booking-handler.service.ts, so back-filled
-- rows and freshly synced ones agree:
--   • display_name is only preferred when it is non-blank. Plain COALESCE would pick an
--     empty string over a populated name/surname, losing the CRM name — and, because the
--     row would then look empty, mislabel it 'user' in pass 3/3.
--   • Altegio sends bare digits ("380950000001"); `toE164` supplies the leading +. Doing
--     the same here keeps historical and new rows in one format, which matters because
--     the sync lookback will never revisit older bookings.
UPDATE "bookings" b
SET "client_name"   = NULLIF(TRIM(COALESCE(NULLIF(TRIM(c."display_name"), ''),
                                           CONCAT_WS(' ', c."name", c."surname"))), ''),
    "client_phone"  = CASE
                        WHEN TRIM(c."phone") ~ '^[0-9]{6,}$' THEN '+' || TRIM(c."phone")
                        ELSE NULLIF(TRIM(c."phone"), '')
                      END,
    "client_email"  = NULLIF(TRIM(c."email"), ''),
    "client_source" = 'altegio'
FROM "altegio_booking_client" c
WHERE c."details_id" = b."id"
  AND COALESCE(NULLIF(TRIM(c."display_name"), ''), NULLIF(TRIM(c."name"), ''),
               NULLIF(TRIM(c."surname"), ''), NULLIF(TRIM(c."phone"), ''),
               NULLIF(TRIM(c."email"), '')) IS NOT NULL;

-- Back-fill 2/3 — EasyWeek. We never mapped the customer onto a column, but the untouched
-- booking payload was always kept in crm_payload and it carries `customer`
-- (first_name / last_name / phone / email; the phone is already E.164).
UPDATE "bookings" b
SET "client_name"   = NULLIF(TRIM(CONCAT_WS(' ',
                        b."crm_payload"->'customer'->>'first_name',
                        b."crm_payload"->'customer'->>'last_name')), ''),
    "client_phone"  = CASE
                        WHEN TRIM(b."crm_payload"->'customer'->>'phone') ~ '^[0-9]{6,}$'
                          THEN '+' || TRIM(b."crm_payload"->'customer'->>'phone')
                        ELSE NULLIF(TRIM(b."crm_payload"->'customer'->>'phone'), '')
                      END,
    "client_email"  = NULLIF(TRIM(b."crm_payload"->'customer'->>'email'), ''),
    "client_source" = 'easyweek'
WHERE b."crm_type" = 'EASYWEEK'
  AND jsonb_typeof(b."crm_payload"->'customer') = 'object';

-- Back-fill 3/3 — whatever the CRM could not supply falls back to the account that booked.
-- Only touches rows the two passes above left entirely empty.
UPDATE "bookings" b
SET "client_name"   = NULLIF(TRIM(CONCAT_WS(' ', u."name", u."second_name")), ''),
    "client_phone"  = CASE
                        WHEN TRIM(u."phone") ~ '^[0-9]{6,}$' THEN '+' || TRIM(u."phone")
                        ELSE NULLIF(TRIM(u."phone"), '')
                      END,
    "client_email"  = NULLIF(TRIM(u."email"), ''),
    "client_source" = 'user'
FROM "users" u
WHERE u."id" = b."user_id"
  AND b."client_name" IS NULL
  AND b."client_phone" IS NULL
  AND b."client_email" IS NULL;
