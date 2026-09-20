-- BEA-71: one row per person per salon, linked from bookings. Until now the owner
-- panel only had the per-booking client snapshot (BEA-68); nothing said that two
-- bookings belong to the same person, so a clients list with bookings count and last
-- visit was not answerable.
--
-- Schema only. Existing bookings are linked by scripts/backfill-salon-clients.ts,
-- run separately after deploy:
--
--     npm run backfill:clients:local      (or :dev / :stage / :prod)
--
-- Deliberately not SQL, for the same reason as the BEA-68 back-fill: the matching
-- rule (user id → CRM client id → normalised name together with an E.164 phone or a
-- normalised email) shares its code with the booking handler, and a SQL copy of a
-- libphonenumber + Unicode-normalisation rule would drift from what the sync writes.
--
-- The exact identities (account, Altegio client, EasyWeek customer) are UNIQUE per
-- salon: the database itself refuses a second row for the same person, whatever a code
-- path forgets. Postgres aborts the transaction on that violation, so the linker never
-- provokes it — it holds a per-salon advisory lock across match and create, and checks
-- ownership before writing an identifier. NULLs are distinct in Postgres unique indexes,
-- so rows without an identifier never clash. Name+contact is a matching rule, not an
-- identity (two people may share a phone), so it is a plain index.

-- CreateTable
CREATE TABLE "salon_clients" (
    "id" UUID NOT NULL,
    "salon_id" UUID NOT NULL,
    "display_name" TEXT,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "name_key" VARCHAR(200),
    "phone" VARCHAR(30),
    "email" VARCHAR(255),
    "avatar_url" TEXT,
    "user_id" UUID,
    "altegio_client_id" VARCHAR(128),
    "easyweek_customer_id" VARCHAR(128),
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL,
    "last_visit_at" TIMESTAMPTZ(6),
    "bookings_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salon_clients_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "client_id" UUID;

-- AddForeignKey
ALTER TABLE "salon_clients" ADD CONSTRAINT "salon_clients_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
-- SET NULL, not CASCADE: deleting a client row must never delete bookings.
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "salon_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
-- Exact identities: unique per salon (see header). Each is also the linker's lookup.
CREATE UNIQUE INDEX "salon_clients_salon_user_unique" ON "salon_clients"("salon_id", "user_id");
CREATE UNIQUE INDEX "salon_clients_salon_altegio_unique" ON "salon_clients"("salon_id", "altegio_client_id");
CREATE UNIQUE INDEX "salon_clients_salon_easyweek_unique" ON "salon_clients"("salon_id", "easyweek_customer_id");

-- CreateIndex
-- Name+contact lookups: a rule, not an identity, so plain indexes.
CREATE INDEX "salon_clients_salon_phone_name_idx" ON "salon_clients"("salon_id", "phone", "name_key");
CREATE INDEX "salon_clients_salon_email_name_idx" ON "salon_clients"("salon_id", "email", "name_key");

-- CreateIndex
-- Owner list sorts: name, last visit, bookings count — all within a salon.
CREATE INDEX "salon_clients_salon_name_idx" ON "salon_clients"("salon_id", "display_name");
CREATE INDEX "salon_clients_salon_last_visit_idx" ON "salon_clients"("salon_id", "last_visit_at" DESC);
CREATE INDEX "salon_clients_salon_bookings_idx" ON "salon_clients"("salon_id", "bookings_count" DESC);

-- CreateIndex
-- The Client Info modal's history (?client_id=) and the per-client counter recompute.
CREATE INDEX "bookings_client_idx" ON "bookings"("client_id");
