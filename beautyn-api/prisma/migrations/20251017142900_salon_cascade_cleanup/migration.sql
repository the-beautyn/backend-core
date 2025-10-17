-- Ensure salon deletions cascade to related categories, services, and workers
ALTER TABLE "public"."categories"
  DROP CONSTRAINT IF EXISTS "categories_salon_id_fkey";
ALTER TABLE "public"."categories"
  ADD CONSTRAINT "categories_salon_id_fkey"
  FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."services"
  DROP CONSTRAINT IF EXISTS "services_salon_id_fkey";
ALTER TABLE "public"."services"
  ADD CONSTRAINT "services_salon_id_fkey"
  FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."workers"
  DROP CONSTRAINT IF EXISTS "workers_salon_id_fkey";
ALTER TABLE "public"."workers"
  ADD CONSTRAINT "workers_salon_id_fkey"
  FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
