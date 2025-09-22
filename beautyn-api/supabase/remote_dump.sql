

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";








ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."crm_salon_change_status" AS ENUM (
    'pending',
    'accepted',
    'dismissed'
);


ALTER TYPE "public"."crm_salon_change_status" OWNER TO "postgres";


CREATE TYPE "public"."onboarding_step_state" AS ENUM (
    'CRM',
    'SUBSCRIPTION',
    'COMPLETED',
    'SALON_PROFILE'
);


ALTER TYPE "public"."onboarding_step_state" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'client',
    'owner',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."CategoryMapping" (
    "id" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "externalId" "text" NOT NULL,
    "categoryId" "uuid" NOT NULL
);


ALTER TABLE "public"."CategoryMapping" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."CrmAccount" (
    "id" "text" NOT NULL,
    "salonId" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "data" "jsonb" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."CrmAccount" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."CrmCredential" (
    "id" "text" NOT NULL,
    "salonId" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "cipherText" "bytea" NOT NULL,
    "iv" "bytea" NOT NULL,
    "authTag" "bytea" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."CrmCredential" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ServiceMapping" (
    "id" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "externalId" "text" NOT NULL,
    "serviceId" "uuid" NOT NULL
);


ALTER TABLE "public"."ServiceMapping" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."SyncOutbox" (
    "id" "text" NOT NULL,
    "salonId" "uuid" NOT NULL,
    "entityType" "text" NOT NULL,
    "entityId" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "op" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "idempotencyKey" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "nextRunAt" timestamp(3) without time zone,
    "lastError" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."SyncOutbox" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."SyncShadow" (
    "id" "text" NOT NULL,
    "entityType" "text" NOT NULL,
    "entityId" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "externalId" "text" NOT NULL,
    "remote" "jsonb" NOT NULL,
    "remoteUpdatedAt" "text",
    "remoteVersion" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."SyncShadow" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."WorkerMapping" (
    "id" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "externalId" "text" NOT NULL,
    "workerId" "uuid" NOT NULL
);


ALTER TABLE "public"."WorkerMapping" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_prisma_migrations" (
    "id" character varying(36) NOT NULL,
    "checksum" character varying(64) NOT NULL,
    "finished_at" timestamp with time zone,
    "migration_name" character varying(255) NOT NULL,
    "logs" "text",
    "rolled_back_at" timestamp with time zone,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "applied_steps_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."_prisma_migrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" NOT NULL,
    "salon_id" "uuid" NOT NULL,
    "crm_external_id" "text",
    "name" "text" NOT NULL,
    "color" character varying(7),
    "sort_order" integer,
    "created_at" timestamp(3) without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_pairing_codes" (
    "id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "salon_id" "uuid",
    "code_hash" "text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "expires_at" timestamp(3) without time zone NOT NULL,
    "used_at" timestamp(3) without time zone,
    "created_at" timestamp(3) without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."crm_pairing_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_salon_change_proposal" (
    "id" "uuid" NOT NULL,
    "salon_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "field_path" "text" NOT NULL,
    "old_value" "jsonb",
    "new_value" "jsonb",
    "new_hash" "text" NOT NULL,
    "status" "public"."crm_salon_change_status" DEFAULT 'pending'::"public"."crm_salon_change_status" NOT NULL,
    "detected_at" timestamp(6) with time zone NOT NULL,
    "decided_at" timestamp(6) with time zone,
    "decided_by" "uuid"
);


ALTER TABLE "public"."crm_salon_change_proposal" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_salon_last_hash" (
    "salon_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "field_path" "text" NOT NULL,
    "last_crm_hash" "text" NOT NULL,
    "updated_at" timestamp(6) with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."crm_salon_last_hash" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_salon_snapshot" (
    "id" "uuid" NOT NULL,
    "salon_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "payload_json" "jsonb" NOT NULL,
    "payload_hash" "text" NOT NULL,
    "fetched_at" timestamp(6) with time zone NOT NULL
);


ALTER TABLE "public"."crm_salon_snapshot" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."onboarding_step" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "crm_connected" boolean DEFAULT false NOT NULL,
    "subscription_set" boolean DEFAULT false NOT NULL,
    "current_step" "public"."onboarding_step_state" DEFAULT 'CRM'::"public"."onboarding_step_state" NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL,
    "salon_created" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."onboarding_step" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."salon_images" (
    "id" "uuid" NOT NULL,
    "salon_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "caption" "text",
    "sort_order" integer,
    "created_at" timestamp(3) without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."salon_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."salons" (
    "id" "uuid" NOT NULL,
    "crm_id" "text",
    "name" "text",
    "address_line" "text",
    "city" "text",
    "country" character(2),
    "latitude" numeric(9,6),
    "longitude" numeric(9,6),
    "phone" "text",
    "email" "text",
    "rating_avg" numeric(2,1),
    "rating_count" integer,
    "open_hours_json" "jsonb",
    "images_count" integer,
    "cover_image_url" "text",
    "created_at" timestamp(3) without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL,
    "deleted_at" timestamp(3) without time zone,
    "external_salon_id" "text",
    "owner_user_id" "uuid",
    "provider" "text",
    "description" "text",
    "timezone" "text",
    "working_schedule" "text"
);


ALTER TABLE "public"."salons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" NOT NULL,
    "salon_id" "uuid" NOT NULL,
    "crm_external_id" "text",
    "category_id" "uuid",
    "name" character varying(160) NOT NULL,
    "description" "text",
    "duration_minutes" integer NOT NULL,
    "price_cents" integer NOT NULL,
    "currency" character(3) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_plan" (
    "id" "uuid" NOT NULL,
    "name" character varying(120) NOT NULL,
    "description" "text" NOT NULL,
    "price_cents" integer NOT NULL,
    "currency" character(3) NOT NULL,
    "duration_days" integer NOT NULL,
    "features" "jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."subscription_plan" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" character varying(255) NOT NULL,
    "role" "public"."user_role" DEFAULT 'client'::"public"."user_role" NOT NULL,
    "name" character varying(100),
    "second_name" character varying(100),
    "phone" character varying(30),
    "avatar_url" "text",
    "is_profile_created" boolean DEFAULT false NOT NULL,
    "is_onboarding_completed" boolean DEFAULT false NOT NULL,
    "subscription_id" "uuid",
    "crm_id" "text",
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."worker_services" (
    "worker_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL
);


ALTER TABLE "public"."worker_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workers" (
    "id" "uuid" NOT NULL,
    "salon_id" "uuid" NOT NULL,
    "first_name" character varying(100) NOT NULL,
    "last_name" character varying(100) NOT NULL,
    "role" character varying(100),
    "email" character varying(255),
    "phone" character varying(30),
    "photo_url" "text",
    "work_schedule" "jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."workers" OWNER TO "postgres";


ALTER TABLE ONLY "public"."CategoryMapping"
    ADD CONSTRAINT "CategoryMapping_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."CrmAccount"
    ADD CONSTRAINT "CrmAccount_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."CrmCredential"
    ADD CONSTRAINT "CrmCredential_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ServiceMapping"
    ADD CONSTRAINT "ServiceMapping_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."SyncOutbox"
    ADD CONSTRAINT "SyncOutbox_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."SyncShadow"
    ADD CONSTRAINT "SyncShadow_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."WorkerMapping"
    ADD CONSTRAINT "WorkerMapping_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_prisma_migrations"
    ADD CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_pairing_codes"
    ADD CONSTRAINT "crm_pairing_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_salon_change_proposal"
    ADD CONSTRAINT "crm_salon_change_proposal_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_salon_last_hash"
    ADD CONSTRAINT "crm_salon_last_hash_pkey" PRIMARY KEY ("salon_id", "provider", "field_path");



ALTER TABLE ONLY "public"."crm_salon_snapshot"
    ADD CONSTRAINT "crm_salon_snapshot_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."onboarding_step"
    ADD CONSTRAINT "onboarding_step_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."salon_images"
    ADD CONSTRAINT "salon_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."salons"
    ADD CONSTRAINT "salons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plan"
    ADD CONSTRAINT "subscription_plan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."worker_services"
    ADD CONSTRAINT "worker_services_pkey" PRIMARY KEY ("worker_id", "service_id");



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_pkey" PRIMARY KEY ("id");



CREATE INDEX "CategoryMapping_categoryId_idx" ON "public"."CategoryMapping" USING "btree" ("categoryId");



CREATE UNIQUE INDEX "CategoryMapping_provider_externalId_key" ON "public"."CategoryMapping" USING "btree" ("provider", "externalId");



CREATE INDEX "CrmAccount_provider_idx" ON "public"."CrmAccount" USING "btree" ("provider");



CREATE UNIQUE INDEX "CrmAccount_salonId_provider_key" ON "public"."CrmAccount" USING "btree" ("salonId", "provider");



CREATE UNIQUE INDEX "CrmCredential_salonId_provider_key" ON "public"."CrmCredential" USING "btree" ("salonId", "provider");



CREATE UNIQUE INDEX "ServiceMapping_provider_externalId_key" ON "public"."ServiceMapping" USING "btree" ("provider", "externalId");



CREATE INDEX "ServiceMapping_serviceId_idx" ON "public"."ServiceMapping" USING "btree" ("serviceId");



CREATE INDEX "SyncOutbox_status_nextRunAt_idx" ON "public"."SyncOutbox" USING "btree" ("status", "nextRunAt");



CREATE UNIQUE INDEX "SyncShadow_entityType_entityId_provider_key" ON "public"."SyncShadow" USING "btree" ("entityType", "entityId", "provider");



CREATE UNIQUE INDEX "WorkerMapping_provider_externalId_key" ON "public"."WorkerMapping" USING "btree" ("provider", "externalId");



CREATE INDEX "WorkerMapping_workerId_idx" ON "public"."WorkerMapping" USING "btree" ("workerId");



CREATE INDEX "crm_pairing_codes_provider_exp_idx" ON "public"."crm_pairing_codes" USING "btree" ("provider", "expires_at");



CREATE INDEX "crm_salon_change_proposal_salon_status_idx" ON "public"."crm_salon_change_proposal" USING "btree" ("salon_id", "status");



CREATE UNIQUE INDEX "crm_salon_change_proposal_unique_hash" ON "public"."crm_salon_change_proposal" USING "btree" ("salon_id", "field_path", "new_hash");



CREATE INDEX "crm_salon_snapshot_salon_fetched_idx" ON "public"."crm_salon_snapshot" USING "btree" ("salon_id", "fetched_at");



CREATE INDEX "idx_category_salon_sort" ON "public"."categories" USING "btree" ("salon_id", "sort_order");



CREATE INDEX "idx_salon_owner" ON "public"."salons" USING "btree" ("owner_user_id");



CREATE UNIQUE INDEX "onboarding_step_user_id_key" ON "public"."onboarding_step" USING "btree" ("user_id");



CREATE INDEX "salon_images_salon_id_sort_order_idx" ON "public"."salon_images" USING "btree" ("salon_id", "sort_order");



CREATE INDEX "salons_latitude_longitude_idx" ON "public"."salons" USING "btree" ("latitude", "longitude");



CREATE INDEX "services_category_id_is_active_idx" ON "public"."services" USING "btree" ("category_id", "is_active");



CREATE INDEX "services_salon_id_is_active_idx" ON "public"."services" USING "btree" ("salon_id", "is_active");



CREATE UNIQUE INDEX "uniq_salon_owner" ON "public"."salons" USING "btree" ("owner_user_id");



CREATE UNIQUE INDEX "users_email_key" ON "public"."users" USING "btree" ("email");



CREATE INDEX "workers_salon_id_first_name_idx" ON "public"."workers" USING "btree" ("salon_id", "first_name");



CREATE INDEX "workers_salon_id_last_name_idx" ON "public"."workers" USING "btree" ("salon_id", "last_name");



ALTER TABLE ONLY "public"."crm_salon_change_proposal"
    ADD CONSTRAINT "crm_salon_change_proposal_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_salon_last_hash"
    ADD CONSTRAINT "crm_salon_last_hash_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_salon_snapshot"
    ADD CONSTRAINT "crm_salon_snapshot_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."onboarding_step"
    ADD CONSTRAINT "onboarding_step_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."salon_images"
    ADD CONSTRAINT "salon_images_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."salons"
    ADD CONSTRAINT "salons_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription_plan"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."worker_services"
    ADD CONSTRAINT "worker_services_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON UPDATE CASCADE ON DELETE CASCADE;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;






































































































































































































RESET ALL;
