-- BEA-53 follow-up: Users.is_onboarding_completed was never written by any flow;
-- onboarding completion source of truth is onboarding_step.completed.
ALTER TABLE "users" DROP COLUMN "is_onboarding_completed";
