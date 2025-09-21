import { OnboardingStep } from '@prisma/client';
import { OnboardingProgressDto } from '../dto/onboarding-progress.dto';

export class OnboardingMapper {
  static toProgressDto(entity: OnboardingStep): OnboardingProgressDto {
    return {
      crm_connected: entity.crmConnected,
      salon_profile_created: entity.salonCreated,
      subscription_set: entity.subscriptionSet,
      completed: entity.completed,
      current_step: entity.currentStep,
    };
  }
}
