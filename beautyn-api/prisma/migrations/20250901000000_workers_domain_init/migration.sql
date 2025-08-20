CREATE TABLE IF NOT EXISTS "workers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "salon_id" uuid NOT NULL,
  "first_name" varchar(100) NOT NULL,
  "last_name" varchar(100) NOT NULL,
  "role" varchar(100),
  "email" varchar(255) UNIQUE,
  "phone" varchar(30) UNIQUE,
  "photo_url" text,
  "work_schedule" jsonb,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "workers_salon_first_idx" ON "workers" ("salon_id","first_name");
CREATE INDEX IF NOT EXISTS "workers_salon_last_idx" ON "workers" ("salon_id","last_name");

CREATE TABLE IF NOT EXISTS "worker_services" (
  "worker_id" uuid NOT NULL,
  "service_id" uuid NOT NULL,
  PRIMARY KEY ("worker_id","service_id")
);
-- Add FK constraints in a follow-up PR after parallel merges.
