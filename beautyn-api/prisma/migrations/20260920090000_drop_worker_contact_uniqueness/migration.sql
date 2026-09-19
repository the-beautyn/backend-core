-- A worker's email and phone were unique across every salon. That was never
-- relied on (workers are addressed by id or by CRM id per salon), and it
-- breaks CRM sync for a chain: one Altegio login linked to a staff card in
-- two locations carries the same contacts, so the second salon's rebase hit
-- a unique violation and aborted. Contacts are plain data, not identity.
--
-- Depending on how a database was first set up, each of these exists either
-- as a UNIQUE constraint (which owns its index) or as a bare unique index;
-- dropping the constraint first covers both.
ALTER TABLE "workers" DROP CONSTRAINT IF EXISTS "workers_email_key";
ALTER TABLE "workers" DROP CONSTRAINT IF EXISTS "workers_phone_key";
DROP INDEX IF EXISTS "workers_email_key";
DROP INDEX IF EXISTS "workers_phone_key";
