-- AlterEnum
ALTER TYPE "public"."onboarding_step_state" ADD VALUE 'SALON_PROFILE';

-- DropIndex
DROP INDEX "public"."salons_open_hours_gin_idx";

-- AlterTable
ALTER TABLE "public"."categories" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "crm_external_id" SET DATA TYPE TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."crm_pairing_codes" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "used_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."onboarding_step" ADD COLUMN     "salon_profile_reviewed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."salon_images" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."salons" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."services" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "crm_external_id" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."workers" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."CrmCredential" (
    "id" TEXT NOT NULL,
    "salonId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "cipherText" BYTEA NOT NULL,
    "iv" BYTEA NOT NULL,
    "authTag" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CrmAccount" (
    "id" TEXT NOT NULL,
    "salonId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SyncShadow" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "remote" JSONB NOT NULL,
    "remoteUpdatedAt" TEXT,
    "remoteVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncShadow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SyncOutbox" (
    "id" TEXT NOT NULL,
    "salonId" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "op" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "idempotencyKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextRunAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CategoryMapping" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "categoryId" UUID NOT NULL,

    CONSTRAINT "CategoryMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServiceMapping" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "serviceId" UUID NOT NULL,

    CONSTRAINT "ServiceMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkerMapping" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "workerId" UUID NOT NULL,

    CONSTRAINT "WorkerMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrmCredential_salonId_provider_key" ON "public"."CrmCredential"("salonId", "provider");

-- CreateIndex
CREATE INDEX "CrmAccount_provider_idx" ON "public"."CrmAccount"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "CrmAccount_salonId_provider_key" ON "public"."CrmAccount"("salonId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "SyncShadow_entityType_entityId_provider_key" ON "public"."SyncShadow"("entityType", "entityId", "provider");

-- CreateIndex
CREATE INDEX "SyncOutbox_status_nextRunAt_idx" ON "public"."SyncOutbox"("status", "nextRunAt");

-- CreateIndex
CREATE INDEX "CategoryMapping_categoryId_idx" ON "public"."CategoryMapping"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryMapping_provider_externalId_key" ON "public"."CategoryMapping"("provider", "externalId");

-- CreateIndex
CREATE INDEX "ServiceMapping_serviceId_idx" ON "public"."ServiceMapping"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceMapping_provider_externalId_key" ON "public"."ServiceMapping"("provider", "externalId");

-- CreateIndex
CREATE INDEX "WorkerMapping_workerId_idx" ON "public"."WorkerMapping"("workerId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerMapping_provider_externalId_key" ON "public"."WorkerMapping"("provider", "externalId");

-- AddForeignKey
ALTER TABLE "public"."salon_images" ADD CONSTRAINT "salon_images_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."services" ADD CONSTRAINT "services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."worker_services" ADD CONSTRAINT "worker_services_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "public"."salon_images_salon_sort_idx" RENAME TO "salon_images_salon_id_sort_order_idx";

-- RenameIndex
ALTER INDEX "public"."salons_lat_lng_idx" RENAME TO "salons_latitude_longitude_idx";

-- RenameIndex
ALTER INDEX "public"."services_category_active_idx" RENAME TO "services_category_id_is_active_idx";

-- RenameIndex
ALTER INDEX "public"."services_salon_active_idx" RENAME TO "services_salon_id_is_active_idx";

-- RenameIndex
ALTER INDEX "public"."workers_salon_first_idx" RENAME TO "workers_salon_id_first_name_idx";

-- RenameIndex
ALTER INDEX "public"."workers_salon_last_idx" RENAME TO "workers_salon_id_last_name_idx";
