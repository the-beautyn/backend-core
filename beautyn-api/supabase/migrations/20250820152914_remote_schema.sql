revoke delete on table "public"."_prisma_migrations" from "anon";

revoke insert on table "public"."_prisma_migrations" from "anon";

revoke references on table "public"."_prisma_migrations" from "anon";

revoke select on table "public"."_prisma_migrations" from "anon";

revoke trigger on table "public"."_prisma_migrations" from "anon";

revoke truncate on table "public"."_prisma_migrations" from "anon";

revoke update on table "public"."_prisma_migrations" from "anon";

revoke delete on table "public"."_prisma_migrations" from "authenticated";

revoke insert on table "public"."_prisma_migrations" from "authenticated";

revoke references on table "public"."_prisma_migrations" from "authenticated";

revoke select on table "public"."_prisma_migrations" from "authenticated";

revoke trigger on table "public"."_prisma_migrations" from "authenticated";

revoke truncate on table "public"."_prisma_migrations" from "authenticated";

revoke update on table "public"."_prisma_migrations" from "authenticated";

revoke delete on table "public"."_prisma_migrations" from "service_role";

revoke insert on table "public"."_prisma_migrations" from "service_role";

revoke references on table "public"."_prisma_migrations" from "service_role";

revoke select on table "public"."_prisma_migrations" from "service_role";

revoke trigger on table "public"."_prisma_migrations" from "service_role";

revoke truncate on table "public"."_prisma_migrations" from "service_role";

revoke update on table "public"."_prisma_migrations" from "service_role";

revoke delete on table "public"."onboarding_step" from "anon";

revoke insert on table "public"."onboarding_step" from "anon";

revoke references on table "public"."onboarding_step" from "anon";

revoke select on table "public"."onboarding_step" from "anon";

revoke trigger on table "public"."onboarding_step" from "anon";

revoke truncate on table "public"."onboarding_step" from "anon";

revoke update on table "public"."onboarding_step" from "anon";

revoke delete on table "public"."onboarding_step" from "authenticated";

revoke insert on table "public"."onboarding_step" from "authenticated";

revoke references on table "public"."onboarding_step" from "authenticated";

revoke select on table "public"."onboarding_step" from "authenticated";

revoke trigger on table "public"."onboarding_step" from "authenticated";

revoke truncate on table "public"."onboarding_step" from "authenticated";

revoke update on table "public"."onboarding_step" from "authenticated";

revoke delete on table "public"."onboarding_step" from "service_role";

revoke insert on table "public"."onboarding_step" from "service_role";

revoke references on table "public"."onboarding_step" from "service_role";

revoke select on table "public"."onboarding_step" from "service_role";

revoke trigger on table "public"."onboarding_step" from "service_role";

revoke truncate on table "public"."onboarding_step" from "service_role";

revoke update on table "public"."onboarding_step" from "service_role";

create table "public"."categories" (
    "id" uuid not null default gen_random_uuid(),
    "salon_id" uuid not null,
    "crm_external_id" character varying(64),
    "name" character varying(120) not null,
    "color" character varying(7),
    "sort_order" integer,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."crm_link_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "token" uuid not null,
    "salon_id" uuid not null,
    "provider" text not null,
    "used" boolean not null default false,
    "expires_at" timestamp with time zone not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."salon_images" (
    "id" uuid not null default gen_random_uuid(),
    "salon_id" uuid not null,
    "image_url" text not null,
    "caption" text,
    "sort_order" integer,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."salons" (
    "id" uuid not null default gen_random_uuid(),
    "crm_id" text,
    "name" text not null,
    "address_line" text,
    "city" text,
    "country" character(2),
    "latitude" numeric(9,6),
    "longitude" numeric(9,6),
    "phone" text,
    "email" text,
    "rating_avg" numeric(2,1),
    "rating_count" integer,
    "open_hours_json" jsonb,
    "images_count" integer,
    "cover_image_url" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "deleted_at" timestamp with time zone
);


create table "public"."services" (
    "id" uuid not null default gen_random_uuid(),
    "salon_id" uuid not null,
    "crm_external_id" character varying(64),
    "category_id" uuid,
    "name" character varying(160) not null,
    "description" text,
    "duration_minutes" integer not null,
    "price_cents" integer not null,
    "currency" character(3) not null,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."worker_services" (
    "worker_id" uuid not null,
    "service_id" uuid not null
);


create table "public"."workers" (
    "id" uuid not null default gen_random_uuid(),
    "salon_id" uuid not null,
    "first_name" character varying(100) not null,
    "last_name" character varying(100) not null,
    "role" character varying(100),
    "email" character varying(255),
    "phone" character varying(30),
    "photo_url" text,
    "work_schedule" jsonb,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (id);

CREATE UNIQUE INDEX crm_link_tokens_pkey ON public.crm_link_tokens USING btree (id);

CREATE UNIQUE INDEX crm_link_tokens_token_key ON public.crm_link_tokens USING btree (token);

CREATE INDEX idx_category_salon_sort ON public.categories USING btree (salon_id, sort_order);

CREATE UNIQUE INDEX salon_images_pkey ON public.salon_images USING btree (id);

CREATE INDEX salon_images_salon_sort_idx ON public.salon_images USING btree (salon_id, sort_order);

CREATE INDEX salons_lat_lng_idx ON public.salons USING btree (latitude, longitude);

CREATE INDEX salons_open_hours_gin_idx ON public.salons USING gin (open_hours_json);

CREATE UNIQUE INDEX salons_pkey ON public.salons USING btree (id);

CREATE INDEX services_category_active_idx ON public.services USING btree (category_id, is_active);

CREATE UNIQUE INDEX services_pkey ON public.services USING btree (id);

CREATE INDEX services_salon_active_idx ON public.services USING btree (salon_id, is_active);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX worker_services_pkey ON public.worker_services USING btree (worker_id, service_id);

CREATE UNIQUE INDEX workers_email_key ON public.workers USING btree (email);

CREATE UNIQUE INDEX workers_phone_key ON public.workers USING btree (phone);

CREATE UNIQUE INDEX workers_pkey ON public.workers USING btree (id);

CREATE INDEX workers_salon_first_idx ON public.workers USING btree (salon_id, first_name);

CREATE INDEX workers_salon_last_idx ON public.workers USING btree (salon_id, last_name);

alter table "public"."categories" add constraint "categories_pkey" PRIMARY KEY using index "categories_pkey";

alter table "public"."crm_link_tokens" add constraint "crm_link_tokens_pkey" PRIMARY KEY using index "crm_link_tokens_pkey";

alter table "public"."salon_images" add constraint "salon_images_pkey" PRIMARY KEY using index "salon_images_pkey";

alter table "public"."salons" add constraint "salons_pkey" PRIMARY KEY using index "salons_pkey";

alter table "public"."services" add constraint "services_pkey" PRIMARY KEY using index "services_pkey";

alter table "public"."worker_services" add constraint "worker_services_pkey" PRIMARY KEY using index "worker_services_pkey";

alter table "public"."workers" add constraint "workers_pkey" PRIMARY KEY using index "workers_pkey";

alter table "public"."categories" add constraint "categories_salon_id_fkey" FOREIGN KEY (salon_id) REFERENCES salons(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."categories" validate constraint "categories_salon_id_fkey";

alter table "public"."crm_link_tokens" add constraint "crm_link_tokens_token_key" UNIQUE using index "crm_link_tokens_token_key";

alter table "public"."salon_images" add constraint "salon_images_salon_id_fkey" FOREIGN KEY (salon_id) REFERENCES salons(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."salon_images" validate constraint "salon_images_salon_id_fkey";

alter table "public"."services" add constraint "services_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."services" validate constraint "services_category_id_fkey";

alter table "public"."services" add constraint "services_salon_id_fkey" FOREIGN KEY (salon_id) REFERENCES salons(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."services" validate constraint "services_salon_id_fkey";

alter table "public"."worker_services" add constraint "worker_services_service_id_fkey" FOREIGN KEY (service_id) REFERENCES services(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."worker_services" validate constraint "worker_services_service_id_fkey";

alter table "public"."worker_services" add constraint "worker_services_worker_id_fkey" FOREIGN KEY (worker_id) REFERENCES workers(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."worker_services" validate constraint "worker_services_worker_id_fkey";

alter table "public"."workers" add constraint "workers_email_key" UNIQUE using index "workers_email_key";

alter table "public"."workers" add constraint "workers_phone_key" UNIQUE using index "workers_phone_key";

alter table "public"."workers" add constraint "workers_salon_id_fkey" FOREIGN KEY (salon_id) REFERENCES salons(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."workers" validate constraint "workers_salon_id_fkey";


