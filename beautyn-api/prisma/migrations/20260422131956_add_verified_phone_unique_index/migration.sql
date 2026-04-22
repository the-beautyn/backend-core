-- Partial unique index: phone must be unique among verified users only.
-- Unverified users may share a phone value until one of them verifies it.
CREATE UNIQUE INDEX "users_phone_verified_unique"
  ON "users" ("phone")
  WHERE "is_phone_verified" = true;
