-- AlterTable
ALTER TABLE "app_categories" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "salon_category_mappings" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "search_history" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "salon_id" UUID NOT NULL,
    "last_query" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "search_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_search_history_user_updated" ON "search_history"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "idx_search_history_created_at" ON "search_history"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_search_history_user_salon" ON "search_history"("user_id", "salon_id");

-- AddForeignKey
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
