-- CreateEnum
CREATE TYPE "sex" AS ENUM ('male', 'female', 'prefer_not_to_say', 'other');

-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "birth_date" DATE,
  ADD COLUMN "city"       VARCHAR(120),
  ADD COLUMN "sex"        "sex";
