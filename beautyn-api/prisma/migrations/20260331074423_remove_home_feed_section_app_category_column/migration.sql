/*
  Warnings:

  - You are about to drop the column `app_category_id` on the `home_feed_sections` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."home_feed_sections" DROP CONSTRAINT "home_feed_sections_app_category_id_fkey";

-- AlterTable
ALTER TABLE "home_feed_sections" DROP COLUMN "app_category_id";
