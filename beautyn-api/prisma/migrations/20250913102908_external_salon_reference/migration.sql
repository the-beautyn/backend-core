/*
  Warnings:

  - A unique constraint covering the columns `[owner_user_id]` on the table `salons` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."salons" ADD COLUMN     "external_salon_id" TEXT,
ADD COLUMN     "owner_user_id" UUID,
ADD COLUMN     "provider" TEXT,
ALTER COLUMN "name" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "idx_salon_owner" ON "public"."salons"("owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_salon_owner" ON "public"."salons"("owner_user_id");

-- AddForeignKey
ALTER TABLE "public"."salons" ADD CONSTRAINT "salons_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
