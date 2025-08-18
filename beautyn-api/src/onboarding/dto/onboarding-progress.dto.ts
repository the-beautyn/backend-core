export class OnboardingProgressDto {
  crm_connected: boolean;
  subscription_set: boolean;
  completed: boolean;
  current_step: 'CRM' | 'SUBSCRIPTION' | 'COMPLETED';
}
