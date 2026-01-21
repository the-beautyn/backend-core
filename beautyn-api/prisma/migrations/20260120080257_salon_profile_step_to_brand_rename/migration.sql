/*
  Warnings:

  - The values [SALON_PROFILE] on the enum `onboarding_step_state` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "onboarding_step_state_new" AS ENUM ('CRM', 'BRAND', 'SUBSCRIPTION', 'COMPLETED');
ALTER TABLE "public"."onboarding_step" ALTER COLUMN "current_step" DROP DEFAULT;
ALTER TABLE "onboarding_step" ALTER COLUMN "current_step" TYPE "onboarding_step_state_new" USING ("current_step"::text::"onboarding_step_state_new");
ALTER TYPE "onboarding_step_state" RENAME TO "onboarding_step_state_old";
ALTER TYPE "onboarding_step_state_new" RENAME TO "onboarding_step_state";
DROP TYPE "public"."onboarding_step_state_old";
ALTER TABLE "onboarding_step" ALTER COLUMN "current_step" SET DEFAULT 'CRM';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."salons" DROP CONSTRAINT "salons_owner_user_id_fkey";
