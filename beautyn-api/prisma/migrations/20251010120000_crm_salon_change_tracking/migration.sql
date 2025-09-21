CREATE TYPE "public"."crm_salon_change_status" AS ENUM ('pending', 'accepted', 'dismissed');

ALTER TABLE "salons" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "salons" ADD COLUMN IF NOT EXISTS "timezone" text;
ALTER TABLE "salons" ADD COLUMN IF NOT EXISTS "working_schedule" text;

CREATE TABLE IF NOT EXISTS "crm_salon_last_hash" (
  "salon_id" uuid NOT NULL,
  "provider" text NOT NULL,
  "field_path" text NOT NULL,
  "last_crm_hash" text NOT NULL,
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "crm_salon_last_hash_pkey" PRIMARY KEY ("salon_id", "provider", "field_path"),
  CONSTRAINT "crm_salon_last_hash_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "crm_salon_change_proposal" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "salon_id" uuid NOT NULL,
  "provider" text NOT NULL,
  "field_path" text NOT NULL,
  "old_value" jsonb,
  "new_value" jsonb,
  "new_hash" text NOT NULL,
  "status" "public"."crm_salon_change_status" NOT NULL DEFAULT 'pending',
  "detected_at" timestamptz(6) NOT NULL,
  "decided_at" timestamptz(6),
  "decided_by" uuid,
  CONSTRAINT "crm_salon_change_proposal_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "crm_salon_snapshot" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "salon_id" uuid NOT NULL,
  "provider" text NOT NULL,
  "payload_json" jsonb NOT NULL,
  "payload_hash" text NOT NULL,
  "fetched_at" timestamptz(6) NOT NULL,
  CONSTRAINT "crm_salon_snapshot_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "crm_salon_change_proposal_salon_status_idx" ON "crm_salon_change_proposal" ("salon_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "crm_salon_change_proposal_unique_hash" ON "crm_salon_change_proposal" ("salon_id", "field_path", "new_hash");
CREATE INDEX IF NOT EXISTS "crm_salon_snapshot_salon_fetched_idx" ON "crm_salon_snapshot" ("salon_id", "fetched_at");
