-- DropForeignKey
ALTER TABLE "public"."crm_salon_change_proposal" DROP CONSTRAINT "crm_salon_change_proposal_salon_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."crm_salon_last_hash" DROP CONSTRAINT "crm_salon_last_hash_salon_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."crm_salon_snapshot" DROP CONSTRAINT "crm_salon_snapshot_salon_id_fkey";

-- AlterTable
ALTER TABLE "public"."crm_salon_change_proposal" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."crm_salon_snapshot" ALTER COLUMN "id" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "public"."crm_salon_last_hash" ADD CONSTRAINT "crm_salon_last_hash_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_salon_change_proposal" ADD CONSTRAINT "crm_salon_change_proposal_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_salon_snapshot" ADD CONSTRAINT "crm_salon_snapshot_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
