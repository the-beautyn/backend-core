/*
  Warnings:

  - A unique constraint covering the columns `[provider,external_salon_id]` on the table `salons` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "brand_member_role" AS ENUM ('owner', 'manager', 'support');

-- DropIndex
DROP INDEX "public"."uniq_salon_owner";

-- AlterTable
ALTER TABLE "salons" ADD COLUMN     "brand_id" UUID;

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_members" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "brand_member_role" NOT NULL DEFAULT 'owner',
    "last_selected_salon_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "brand_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brand_members_user_idx" ON "brand_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "brand_members_brand_user_unique" ON "brand_members"("brand_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_salon_brand" ON "salons"("brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_salon_provider_external" ON "salons"("provider", "external_salon_id");

-- AddForeignKey
ALTER TABLE "brand_members" ADD CONSTRAINT "brand_members_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_members" ADD CONSTRAINT "brand_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_members" ADD CONSTRAINT "brand_members_last_selected_salon_id_fkey" FOREIGN KEY ("last_selected_salon_id") REFERENCES "salons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salons" ADD CONSTRAINT "salons_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
