import { ConfigService } from '@nestjs/config';

/**
 * BEA-53: the Subscription onboarding step is deferred (see BEA-26).
 * When false (default), brand creation completes onboarding directly and
 * legacy rows stuck at SUBSCRIPTION are reported as COMPLETED on reads.
 */
export const ONBOARDING_SUBSCRIPTION_ENABLED = 'ONBOARDING_SUBSCRIPTION_ENABLED';

export function isSubscriptionStepEnabled(config: ConfigService): boolean {
  return config.get(ONBOARDING_SUBSCRIPTION_ENABLED, 'false') === 'true';
}
