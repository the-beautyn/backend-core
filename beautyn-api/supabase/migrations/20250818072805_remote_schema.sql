create type "public"."onboarding_step_state" as enum ('CRM', 'SUBSCRIPTION', 'COMPLETED');

drop trigger if exists "trg_subscription_plan_updated_at" on "public"."subscription_plan";

drop trigger if exists "trg_users_updated_at" on "public"."users";

drop policy "Enable read access for all users" on "public"."subscription_plan";

drop policy "Enable read access for all users" on "public"."users";

revoke delete on table "public"."subscription_plan" from "anon";

revoke insert on table "public"."subscription_plan" from "anon";

revoke references on table "public"."subscription_plan" from "anon";

revoke select on table "public"."subscription_plan" from "anon";

revoke trigger on table "public"."subscription_plan" from "anon";

revoke truncate on table "public"."subscription_plan" from "anon";

revoke update on table "public"."subscription_plan" from "anon";

revoke delete on table "public"."subscription_plan" from "authenticated";

revoke insert on table "public"."subscription_plan" from "authenticated";

revoke references on table "public"."subscription_plan" from "authenticated";

revoke select on table "public"."subscription_plan" from "authenticated";

revoke trigger on table "public"."subscription_plan" from "authenticated";

revoke truncate on table "public"."subscription_plan" from "authenticated";

revoke update on table "public"."subscription_plan" from "authenticated";

revoke delete on table "public"."subscription_plan" from "service_role";

revoke insert on table "public"."subscription_plan" from "service_role";

revoke references on table "public"."subscription_plan" from "service_role";

revoke select on table "public"."subscription_plan" from "service_role";

revoke trigger on table "public"."subscription_plan" from "service_role";

revoke truncate on table "public"."subscription_plan" from "service_role";

revoke update on table "public"."subscription_plan" from "service_role";

revoke delete on table "public"."users" from "anon";

revoke insert on table "public"."users" from "anon";

revoke references on table "public"."users" from "anon";

revoke select on table "public"."users" from "anon";

revoke trigger on table "public"."users" from "anon";

revoke truncate on table "public"."users" from "anon";

revoke update on table "public"."users" from "anon";

revoke delete on table "public"."users" from "authenticated";

revoke insert on table "public"."users" from "authenticated";

revoke references on table "public"."users" from "authenticated";

revoke select on table "public"."users" from "authenticated";

revoke trigger on table "public"."users" from "authenticated";

revoke truncate on table "public"."users" from "authenticated";

revoke update on table "public"."users" from "authenticated";

revoke delete on table "public"."users" from "service_role";

revoke insert on table "public"."users" from "service_role";

revoke references on table "public"."users" from "service_role";

revoke select on table "public"."users" from "service_role";

revoke trigger on table "public"."users" from "service_role";

revoke truncate on table "public"."users" from "service_role";

revoke update on table "public"."users" from "service_role";

alter table "public"."users" drop constraint "users_email_key";

drop function if exists "public"."set_subscription_plan_updated_at"();

drop function if exists "public"."set_users_updated_at"();

create table "public"."_prisma_migrations" (
    "id" character varying(36) not null,
    "checksum" character varying(64) not null,
    "finished_at" timestamp with time zone,
    "migration_name" character varying(255) not null,
    "logs" text,
    "rolled_back_at" timestamp with time zone,
    "started_at" timestamp with time zone not null default now(),
    "applied_steps_count" integer not null default 0
);


create table "public"."onboarding_step" (
    "id" uuid not null,
    "user_id" uuid not null,
    "crm_connected" boolean not null default false,
    "subscription_set" boolean not null default false,
    "current_step" onboarding_step_state not null default 'CRM'::onboarding_step_state,
    "completed" boolean not null default false,
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) without time zone not null
);


alter table "public"."subscription_plan" alter column "created_at" set default CURRENT_TIMESTAMP;

alter table "public"."subscription_plan" alter column "created_at" set data type timestamp(6) with time zone using "created_at"::timestamp(6) with time zone;

alter table "public"."subscription_plan" alter column "updated_at" set default CURRENT_TIMESTAMP;

alter table "public"."subscription_plan" alter column "updated_at" set data type timestamp(6) with time zone using "updated_at"::timestamp(6) with time zone;

alter table "public"."subscription_plan" disable row level security;

alter table "public"."users" alter column "created_at" set default CURRENT_TIMESTAMP;

alter table "public"."users" alter column "created_at" set data type timestamp(6) with time zone using "created_at"::timestamp(6) with time zone;

alter table "public"."users" alter column "updated_at" set default CURRENT_TIMESTAMP;

alter table "public"."users" alter column "updated_at" set data type timestamp(6) with time zone using "updated_at"::timestamp(6) with time zone;

alter table "public"."users" disable row level security;

CREATE UNIQUE INDEX _prisma_migrations_pkey ON public._prisma_migrations USING btree (id);

CREATE UNIQUE INDEX onboarding_step_pkey ON public.onboarding_step USING btree (id);

CREATE UNIQUE INDEX onboarding_step_user_id_key ON public.onboarding_step USING btree (user_id);

alter table "public"."_prisma_migrations" add constraint "_prisma_migrations_pkey" PRIMARY KEY using index "_prisma_migrations_pkey";

alter table "public"."onboarding_step" add constraint "onboarding_step_pkey" PRIMARY KEY using index "onboarding_step_pkey";

alter table "public"."onboarding_step" add constraint "onboarding_step_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."onboarding_step" validate constraint "onboarding_step_user_id_fkey";


