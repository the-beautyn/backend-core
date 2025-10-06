-- Expand salons.country to store full country names
-- Previous type: CHAR(2)
-- New type: VARCHAR(64)

BEGIN;

ALTER TABLE "salons"
  ALTER COLUMN "country" TYPE VARCHAR(64);

COMMIT;



