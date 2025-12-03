-- CreateEnum
CREATE TYPE "SalonCategoryMappingUpdatedBy" AS ENUM ('system', 'owner');

-- CreateTable
CREATE TABLE "app_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "keywords" VARCHAR(160)[] DEFAULT ARRAY[]::VARCHAR(160)[],
    "sort_order" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salon_category_mappings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "salon_category_id" UUID NOT NULL,
    "app_category_id" UUID,
    "auto_matched" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION,
    "updated_by" "SalonCategoryMappingUpdatedBy" NOT NULL DEFAULT 'system',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "salon_category_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_categories_slug_key" ON "app_categories"("slug");

-- CreateIndex
CREATE INDEX "app_categories_is_active_sort_order_idx" ON "app_categories"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "salon_category_mappings_app_category_id_idx" ON "salon_category_mappings"("app_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "salon_category_mappings_salon_category_id_key" ON "salon_category_mappings"("salon_category_id");

-- AddForeignKey
ALTER TABLE "salon_category_mappings" ADD CONSTRAINT "salon_category_mappings_salon_category_id_fkey" FOREIGN KEY ("salon_category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salon_category_mappings" ADD CONSTRAINT "salon_category_mappings_app_category_id_fkey" FOREIGN KEY ("app_category_id") REFERENCES "app_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
