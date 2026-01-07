-- AlterTable
ALTER TABLE "altegio_booking_documents" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "altegio_booking_goods_transactions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "altegio_booking_services" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
