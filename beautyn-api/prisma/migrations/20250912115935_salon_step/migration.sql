/*
  Warnings:

  - You are about to drop the column `salon_profile_reviewed` on the `onboarding_step` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."onboarding_step" DROP COLUMN "salon_profile_reviewed",
ADD COLUMN     "salon_created" BOOLEAN NOT NULL DEFAULT false;
