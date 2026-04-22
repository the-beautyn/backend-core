-- CreateEnum
CREATE TYPE "auth_provider" AS ENUM ('email', 'apple', 'google');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "auth_provider" "auth_provider" NOT NULL DEFAULT 'email',
ADD COLUMN     "is_phone_verified" BOOLEAN NOT NULL DEFAULT false;
