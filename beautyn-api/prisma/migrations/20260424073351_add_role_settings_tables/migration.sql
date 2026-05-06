-- CreateTable
CREATE TABLE "client_settings" (
    "user_id" UUID NOT NULL,
    "push_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sms_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "client_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "owner_settings" (
    "user_id" UUID NOT NULL,
    "in_app_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sms_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "owner_settings_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "client_settings" ADD CONSTRAINT "client_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_settings" ADD CONSTRAINT "owner_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every existing client gets a client_settings row
INSERT INTO "client_settings" ("user_id", "updated_at")
SELECT "id", CURRENT_TIMESTAMP FROM "users" WHERE "role" = 'client'
ON CONFLICT ("user_id") DO NOTHING;

-- Backfill: every existing owner gets an owner_settings row
INSERT INTO "owner_settings" ("user_id", "updated_at")
SELECT "id", CURRENT_TIMESTAMP FROM "users" WHERE "role" = 'owner'
ON CONFLICT ("user_id") DO NOTHING;
