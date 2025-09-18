export class OnboardingProgressDto {
  crm_connected: boolean;
  salon_profile_created: boolean;
  subscription_set: boolean;
  completed: boolean;
  current_step: 'CRM' | 'SALON_PROFILE' | 'SUBSCRIPTION' | 'COMPLETED';
}
