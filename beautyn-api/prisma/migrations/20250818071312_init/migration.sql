-- CreateEnum
CREATE TYPE "public"."user_role" AS ENUM ('client', 'owner', 'admin');

-- CreateEnum
CREATE TYPE "public"."onboarding_step_state" AS ENUM ('CRM', 'SUBSCRIPTION', 'COMPLETED');

-- CreateTable
CREATE TABLE "public"."subscription_plan" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "features" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" "public"."user_role" NOT NULL DEFAULT 'client',
    "name" VARCHAR(100),
    "second_name" VARCHAR(100),
    "phone" VARCHAR(30),
    "avatar_url" TEXT,
    "is_profile_created" BOOLEAN NOT NULL DEFAULT false,
    "is_onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "subscription_id" UUID,
    "crm_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."onboarding_step" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "crm_connected" BOOLEAN NOT NULL DEFAULT false,
    "subscription_set" BOOLEAN NOT NULL DEFAULT false,
    "current_step" "public"."onboarding_step_state" NOT NULL DEFAULT 'CRM',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_step_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_step_user_id_key" ON "public"."onboarding_step"("user_id");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription_plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."onboarding_step" ADD CONSTRAINT "onboarding_step_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
