/*
  Warnings:

  - Made the column `crm_category_id` on table `categories` required. This step will fail if there are existing NULL values in that column.
  - Made the column `crm_service_id` on table `services` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "crm_category_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "services" ALTER COLUMN "crm_service_id" SET NOT NULL;
