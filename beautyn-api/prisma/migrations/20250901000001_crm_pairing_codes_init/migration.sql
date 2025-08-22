CREATE TABLE IF NOT EXISTS "crm_pairing_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider" text NOT NULL,
  "user_id" uuid NOT NULL,
  "salon_id" uuid,
  "code_hash" text NOT NULL,
  "attempts" integer NOT NULL DEFAULT 0,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "crm_pairing_codes_provider_exp_idx" ON "crm_pairing_codes" ("provider","expires_at");
