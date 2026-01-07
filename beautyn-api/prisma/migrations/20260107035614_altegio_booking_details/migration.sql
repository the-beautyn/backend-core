-- CreateTable
CREATE TABLE "altegio_booking_details" (
    "booking_id" UUID NOT NULL,
    "crm_record_id" TEXT,
    "company_id" TEXT,
    "staff_id" TEXT,
    "client_id" TEXT,
    "datetime" TIMESTAMPTZ(6),
    "date" TIMESTAMPTZ(6),
    "create_date" TIMESTAMPTZ(6),
    "comment" TEXT,
    "online" BOOLEAN,
    "attendance" INTEGER,
    "visit_attendance" INTEGER,
    "confirmed" INTEGER,
    "seance_length" INTEGER,
    "length" INTEGER,
    "technical_break_duration" INTEGER,
    "sms_before" INTEGER,
    "sms_now" INTEGER,
    "email_now" INTEGER,
    "notified" INTEGER,
    "master_request" INTEGER,
    "api_id" TEXT,
    "from_url" TEXT,
    "review_requested" INTEGER,
    "visit_id" TEXT,
    "created_user_id" TEXT,
    "deleted" BOOLEAN,
    "paid_full" INTEGER,
    "prepaid" BOOLEAN,
    "prepaid_confirmed" BOOLEAN,
    "is_update_blocked" BOOLEAN,
    "last_change_date" TIMESTAMPTZ(6),
    "custom_color" TEXT,
    "custom_font_color" TEXT,
    "sms_remain_hours" INTEGER,
    "email_remain_hours" INTEGER,
    "bookform_id" INTEGER,
    "record_from" TEXT,
    "is_mobile" INTEGER,
    "short_link" TEXT,
    "raw_payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "altegio_booking_details_pkey" PRIMARY KEY ("booking_id")
);

-- CreateTable
CREATE TABLE "altegio_booking_staff" (
    "details_id" UUID NOT NULL,
    "external_id" TEXT,
    "api_id" TEXT,
    "name" TEXT,
    "specialization" TEXT,
    "position" JSONB,
    "avatar" TEXT,
    "avatar_big" TEXT,
    "rating" DOUBLE PRECISION,
    "votes_count" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "altegio_booking_staff_pkey" PRIMARY KEY ("details_id")
);

-- CreateTable
CREATE TABLE "altegio_booking_client" (
    "details_id" UUID NOT NULL,
    "external_id" TEXT,
    "name" TEXT,
    "surname" TEXT,
    "patronymic" TEXT,
    "display_name" TEXT,
    "comment" TEXT,
    "phone" TEXT,
    "card" TEXT,
    "email" TEXT,
    "success_visits_count" INTEGER,
    "fail_visits_count" INTEGER,
    "discount" INTEGER,
    "sex" INTEGER,
    "birthday" TEXT,
    "client_tags" JSONB,
    "custom_fields" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "altegio_booking_client_pkey" PRIMARY KEY ("details_id")
);

-- CreateTable
CREATE TABLE "altegio_booking_services" (
    "id" UUID NOT NULL,
    "details_id" UUID NOT NULL,
    "external_id" TEXT,
    "title" TEXT,
    "cost" INTEGER,
    "cost_to_pay" INTEGER,
    "manual_cost" INTEGER,
    "cost_per_unit" INTEGER,
    "discount" INTEGER,
    "first_cost" INTEGER,
    "amount" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "altegio_booking_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "altegio_booking_documents" (
    "id" UUID NOT NULL,
    "details_id" UUID NOT NULL,
    "external_id" TEXT,
    "type_id" INTEGER,
    "storage_id" INTEGER,
    "user_id" INTEGER,
    "company_id" INTEGER,
    "number" INTEGER,
    "comment" TEXT,
    "date_created" TIMESTAMPTZ(6),
    "category_id" INTEGER,
    "visit_id" TEXT,
    "record_id" TEXT,
    "type_title" TEXT,
    "is_sale_bill_printed" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "altegio_booking_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "altegio_booking_goods_transactions" (
    "id" UUID NOT NULL,
    "details_id" UUID NOT NULL,
    "external_id" TEXT,
    "type_id" INTEGER,
    "storage_id" INTEGER,
    "user_id" INTEGER,
    "company_id" INTEGER,
    "number" INTEGER,
    "comment" TEXT,
    "date_created" TIMESTAMPTZ(6),
    "category_id" INTEGER,
    "visit_id" TEXT,
    "record_id" TEXT,
    "type_title" TEXT,
    "is_sale_bill_printed" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "altegio_booking_goods_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "altegio_booking_services_details_idx" ON "altegio_booking_services"("details_id");

-- CreateIndex
CREATE INDEX "altegio_booking_documents_details_idx" ON "altegio_booking_documents"("details_id");

-- CreateIndex
CREATE INDEX "altegio_booking_goods_details_idx" ON "altegio_booking_goods_transactions"("details_id");

-- AddForeignKey
ALTER TABLE "altegio_booking_details" ADD CONSTRAINT "altegio_booking_details_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "altegio_booking_staff" ADD CONSTRAINT "altegio_booking_staff_details_id_fkey" FOREIGN KEY ("details_id") REFERENCES "altegio_booking_details"("booking_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "altegio_booking_client" ADD CONSTRAINT "altegio_booking_client_details_id_fkey" FOREIGN KEY ("details_id") REFERENCES "altegio_booking_details"("booking_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "altegio_booking_services" ADD CONSTRAINT "altegio_booking_services_details_id_fkey" FOREIGN KEY ("details_id") REFERENCES "altegio_booking_details"("booking_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "altegio_booking_documents" ADD CONSTRAINT "altegio_booking_documents_details_id_fkey" FOREIGN KEY ("details_id") REFERENCES "altegio_booking_details"("booking_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "altegio_booking_goods_transactions" ADD CONSTRAINT "altegio_booking_goods_transactions_details_id_fkey" FOREIGN KEY ("details_id") REFERENCES "altegio_booking_details"("booking_id") ON DELETE CASCADE ON UPDATE CASCADE;
