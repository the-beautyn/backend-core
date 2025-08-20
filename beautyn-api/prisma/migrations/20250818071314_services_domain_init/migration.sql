CREATE TABLE IF NOT EXISTS "categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "salon_id" uuid NOT NULL,
  "crm_external_id" varchar(64),
  "name" varchar(120) NOT NULL,
  "color" varchar(7),
  "sort_order" integer,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_category_salon_sort" ON "categories" ("salon_id","sort_order");

CREATE TABLE IF NOT EXISTS "services" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "salon_id" uuid NOT NULL,
  "crm_external_id" varchar(64),
  "category_id" uuid,
  "name" varchar(160) NOT NULL,
  "description" text,
  "duration_minutes" integer NOT NULL,
  "price_cents" integer NOT NULL,
  "currency" char(3) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "services_salon_active_idx" ON "services" ("salon_id","is_active");
CREATE INDEX IF NOT EXISTS "services_category_active_idx" ON "services" ("category_id","is_active");
-- Add FKs later in a follow-up to keep parallel branches conflict-free.
