/*
  Warnings:

  - You are about to drop the column `worker_ids` on the `services` table. All the data in the column will be lost.
  - The primary key for the `worker_services` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[service_id,worker_id]` on the table `worker_services` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[service_id,remote_worker_id]` on the table `worker_services` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `worker_services` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "services" DROP COLUMN "worker_ids";

-- AlterTable
ALTER TABLE "worker_services" DROP CONSTRAINT "worker_services_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "remote_worker_id" VARCHAR(128),
ALTER COLUMN "worker_id" DROP NOT NULL,
ADD CONSTRAINT "worker_services_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "workers" ADD COLUMN     "crm_worker_id" VARCHAR(128),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "position" VARCHAR(160);

-- CreateIndex
CREATE UNIQUE INDEX "worker_services_service_worker_unique" ON "worker_services"("service_id", "worker_id");

-- CreateIndex
CREATE UNIQUE INDEX "worker_services_service_remote_unique" ON "worker_services"("service_id", "remote_worker_id");

-- CreateIndex
CREATE INDEX "workers_salon_id_crm_worker_id_idx" ON "workers"("salon_id", "crm_worker_id");

-- AddForeignKey
ALTER TABLE "worker_services" ADD CONSTRAINT "worker_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
