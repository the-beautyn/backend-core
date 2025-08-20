CREATE TABLE IF NOT EXISTS "crm_link_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "token" uuid UNIQUE NOT NULL,
  "salon_id" uuid NOT NULL,
  "provider" text NOT NULL,
  "used" boolean NOT NULL DEFAULT false,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
