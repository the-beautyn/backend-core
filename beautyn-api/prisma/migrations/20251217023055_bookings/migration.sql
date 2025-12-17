-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "salon_id" UUID NOT NULL,
    "user_id" UUID,
    "worker_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'created',
    "datetime" TIMESTAMPTZ(6) NOT NULL,
    "comment" TEXT,
    "attendance" INTEGER DEFAULT 1,
    "crm_record_id" TEXT,
    "crm_company_id" TEXT,
    "crm_staff_id" TEXT,
    "crm_service_ids" JSONB,
    "service_ids" JSONB,
    "short_link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookings_salon_idx" ON "bookings"("salon_id");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
