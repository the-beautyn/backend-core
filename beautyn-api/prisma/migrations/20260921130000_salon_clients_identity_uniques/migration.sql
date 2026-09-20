-- BEA-71: make the exact client identities unique per salon.
--
-- The first cut relied on a per-salon advisory lock alone to stop two concurrent syncs
-- creating the same person twice. That works only if every code path remembers to hold
-- the lock across match and create; review found several that did not. A unique index
-- makes the guarantee structural: whatever a path forgets, the database refuses the
-- second row, and the linker re-matches on the conflict instead of failing the booking.
--
-- Only the exact identities (account, Altegio client, EasyWeek customer). Name+contact
-- is a matching rule, not an identity — two people may legitimately share a phone — so
-- it stays a plain index. NULLs are distinct in Postgres unique indexes, so rows without
-- an identifier never conflict with each other.

-- DropIndex
DROP INDEX "salon_clients_salon_user_idx";
DROP INDEX "salon_clients_salon_altegio_idx";
DROP INDEX "salon_clients_salon_easyweek_idx";

-- CreateIndex
CREATE UNIQUE INDEX "salon_clients_salon_user_unique" ON "salon_clients"("salon_id", "user_id");
CREATE UNIQUE INDEX "salon_clients_salon_altegio_unique" ON "salon_clients"("salon_id", "altegio_client_id");
CREATE UNIQUE INDEX "salon_clients_salon_easyweek_unique" ON "salon_clients"("salon_id", "easyweek_customer_id");
