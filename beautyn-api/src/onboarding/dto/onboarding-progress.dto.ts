export class OnboardingProgressDto {
  crm_connected: boolean;
  brand_created: boolean;
  subscription_set: boolean;
  completed: boolean;
  current_step: 'CRM' | 'BRAND' | 'SUBSCRIPTION' | 'COMPLETED';
}
