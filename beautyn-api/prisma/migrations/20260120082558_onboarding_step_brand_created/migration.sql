/*
  Warnings:

  - You are about to drop the column `salon_created` on the `onboarding_step` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."salons" DROP CONSTRAINT "salons_brand_id_fkey";

-- AlterTable
ALTER TABLE "onboarding_step" DROP COLUMN "salon_created",
ADD COLUMN     "brand_created" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "salons" ADD CONSTRAINT "salons_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmAccount" ADD CONSTRAINT "CrmAccount_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
