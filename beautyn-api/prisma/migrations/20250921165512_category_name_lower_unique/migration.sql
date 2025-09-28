-- Ensure case-insensitive uniqueness for category names per salon
CREATE UNIQUE INDEX IF NOT EXISTS "idx_category_salon_lower_name"
  ON "categories" ("salon_id", lower("name"));
