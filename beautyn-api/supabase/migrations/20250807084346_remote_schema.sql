alter table "public"."users" drop column "password_hash";

alter table "public"."users" alter column "name" drop not null;

alter table "public"."users" alter column "phone" drop not null;

alter table "public"."users" alter column "second_name" drop not null;


