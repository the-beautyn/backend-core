/*
  Warnings:

  - You are about to drop the column `crm_external_id` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `crm_external_id` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `duration_minutes` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `price_cents` on the `services` table. All the data in the column will be lost.
  - Added the required column `duration` to the `services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `services` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "categories" DROP COLUMN "crm_external_id",
ADD COLUMN     "crm_category_id" VARCHAR(64);

-- AlterTable
ALTER TABLE "services" DROP COLUMN "crm_external_id",
DROP COLUMN "duration_minutes",
DROP COLUMN "price_cents",
ADD COLUMN     "crm_service_id" TEXT,
ADD COLUMN     "duration" INTEGER NOT NULL,
ADD COLUMN     "price" INTEGER NOT NULL,
ADD COLUMN     "sort_order" INTEGER,
ADD COLUMN     "worker_ids" TEXT[];
