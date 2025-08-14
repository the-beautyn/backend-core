-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('admin', 'client', 'owner');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "name" VARCHAR(100),
    "secondName" VARCHAR(100),
    "phone" VARCHAR(30),
    "avatarUrl" TEXT,
    "isProfileCreated" BOOLEAN NOT NULL DEFAULT false,
    "isOnboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");
