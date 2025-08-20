CREATE TABLE IF NOT EXISTS "salons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "crm_id" text,
  "name" text NOT NULL,
  "address_line" text,
  "city" text,
  "country" char(2),
  "latitude" numeric(9,6),
  "longitude" numeric(9,6),
  "phone" text,
  "email" text,
  "rating_avg" numeric(2,1),
  "rating_count" integer,
  "open_hours_json" jsonb,
  "images_count" integer,
  "cover_image_url" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);
CREATE INDEX IF NOT EXISTS "salons_lat_lng_idx" ON "salons" ("latitude","longitude");
CREATE INDEX IF NOT EXISTS "salons_open_hours_gin_idx" ON "salons" USING GIN ("open_hours_json");

CREATE TABLE IF NOT EXISTS "salon_images" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "salon_id" uuid NOT NULL,
  "image_url" text NOT NULL,
  "caption" text,
  "sort_order" integer,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "salon_images_salon_sort_idx" ON "salon_images" ("salon_id","sort_order");
-- FKs can be added in a later integration PR to keep parallel branches conflict-free.
