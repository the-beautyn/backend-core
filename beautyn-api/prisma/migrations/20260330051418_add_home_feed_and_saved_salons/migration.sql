-- AlterTable
ALTER TABLE "app_categories" ADD COLUMN     "image_url" TEXT;

-- CreateTable
CREATE TABLE "saved_salons" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "salon_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_salons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_feed_sections" (
    "id" UUID NOT NULL,
    "type" VARCHAR(32) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "emoji" VARCHAR(10),
    "app_category_id" UUID,
    "sort_order" INTEGER NOT NULL,
    "limit" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "filters" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "home_feed_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_salons_user_id_idx" ON "saved_salons"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_salons_user_id_salon_id_key" ON "saved_salons"("user_id", "salon_id");

-- AddForeignKey
ALTER TABLE "saved_salons" ADD CONSTRAINT "saved_salons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_salons" ADD CONSTRAINT "saved_salons_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_feed_sections" ADD CONSTRAINT "home_feed_sections_app_category_id_fkey" FOREIGN KEY ("app_category_id") REFERENCES "app_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
