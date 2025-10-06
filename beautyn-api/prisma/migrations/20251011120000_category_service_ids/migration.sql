ALTER TABLE "categories" ADD COLUMN "service_ids" UUID[] NOT NULL DEFAULT '{}'::uuid[];
