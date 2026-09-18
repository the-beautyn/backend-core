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

-- The three passes below mirror `resolveClientSnapshot` in booking-handler.service.ts, so
-- a back-filled row and a freshly synced one agree. Two rules are easy to get wrong and
-- are applied consistently throughout:
--
--   • Phone. Altegio sends bare digits ("380950000001") and the handler's `toE164`
--     supplies the leading +. The same is done here, because the sync lookback never
--     revisits older bookings and would never reconcile the difference. Values too long
--     for VARCHAR(30) are dropped rather than written: CRM phone fields sometimes hold
--     free text, the source columns are unbounded TEXT, and an oversized value would
--     abort this migration.
--
--   • "Has any data". A source is only stamped when at least one of name/phone/email is
--     non-blank, matching `hasAnyClientField`. Otherwise a blank CRM customer or a blank
--     account would leave a row with a provenance and nothing to show for it, which the
--     runtime never produces.

-- Back-fill 1/3 — Altegio. The client arrives with the record and is already stored in
-- altegio_booking_client, whose details_id chains 1:1:1 back to bookings.id. That table
-- always has a row (the mapper writes all-nulls when Altegio sent no client), so its
-- presence is not evidence of a client — hence the guard.
-- `display_name` wins only when non-blank: plain COALESCE would pick an empty string over
-- a populated name/surname, losing the CRM name and letting pass 3 mislabel the row.
UPDATE "bookings" b
SET "client_name"   = NULLIF(TRIM(COALESCE(NULLIF(TRIM(c."display_name"), ''),
                                           CONCAT_WS(' ', c."name", c."surname"))), ''),
    "client_phone"  = CASE
                        WHEN TRIM(c."phone") ~ '^[0-9]{6,}$'
                             AND length(TRIM(c."phone")) <= 29 THEN '+' || TRIM(c."phone")
                        WHEN length(TRIM(c."phone")) <= 30      THEN NULLIF(TRIM(c."phone"), '')
                        ELSE NULL
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
                             AND length(TRIM(b."crm_payload"->'customer'->>'phone')) <= 29
                          THEN '+' || TRIM(b."crm_payload"->'customer'->>'phone')
                        WHEN length(TRIM(b."crm_payload"->'customer'->>'phone')) <= 30
                          THEN NULLIF(TRIM(b."crm_payload"->'customer'->>'phone'), '')
                        ELSE NULL
                      END,
    "client_email"  = NULLIF(TRIM(b."crm_payload"->'customer'->>'email'), ''),
    "client_source" = 'easyweek'
WHERE b."crm_type" = 'EASYWEEK'
  AND jsonb_typeof(b."crm_payload"->'customer') = 'object'
  AND COALESCE(NULLIF(TRIM(b."crm_payload"->'customer'->>'first_name'), ''),
               NULLIF(TRIM(b."crm_payload"->'customer'->>'last_name'), ''),
               NULLIF(TRIM(b."crm_payload"->'customer'->>'phone'), ''),
               NULLIF(TRIM(b."crm_payload"->'customer'->>'email'), '')) IS NOT NULL;

-- Back-fill 3/3 — whatever the CRM could not supply falls back to the account that booked.
-- Only touches rows the two passes above left entirely empty, and only when the account
-- itself has something to offer.
UPDATE "bookings" b
SET "client_name"   = NULLIF(TRIM(CONCAT_WS(' ', u."name", u."second_name")), ''),
    "client_phone"  = CASE
                        WHEN TRIM(u."phone") ~ '^[0-9]{6,}$'
                             AND length(TRIM(u."phone")) <= 29 THEN '+' || TRIM(u."phone")
                        WHEN length(TRIM(u."phone")) <= 30      THEN NULLIF(TRIM(u."phone"), '')
                        ELSE NULL
                      END,
    "client_email"  = NULLIF(TRIM(u."email"), ''),
    "client_source" = 'user'
FROM "users" u
WHERE u."id" = b."user_id"
  AND b."client_name" IS NULL
  AND b."client_phone" IS NULL
  AND b."client_email" IS NULL
  AND COALESCE(NULLIF(TRIM(u."name"), ''), NULLIF(TRIM(u."second_name"), ''),
               NULLIF(TRIM(u."phone"), ''), NULLIF(TRIM(u."email"), '')) IS NOT NULL;
