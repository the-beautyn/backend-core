-- CreateEnum
CREATE TYPE "OnboardingStepState" AS ENUM ('CRM', 'SUBSCRIPTION', 'COMPLETED');

-- CreateTable
CREATE TABLE "OnboardingStep" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "crmConnected" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionSet" BOOLEAN NOT NULL DEFAULT false,
    "currentStep" "OnboardingStepState" NOT NULL DEFAULT 'CRM',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OnboardingStep_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OnboardingStep_userId_key" UNIQUE ("userId"),
    CONSTRAINT "OnboardingStep_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
