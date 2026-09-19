-- A worker's email and phone were unique across every salon. That was never
-- relied on (workers are addressed by id or by CRM id per salon), and it
-- breaks CRM sync for a chain: one Altegio login linked to a staff card in
-- two locations carries the same contacts, so the second salon's rebase hit
-- a unique violation and aborted. Contacts are plain data, not identity.
DROP INDEX IF EXISTS "workers_email_key";
DROP INDEX IF EXISTS "workers_phone_key";
