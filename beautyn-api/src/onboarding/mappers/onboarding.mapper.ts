import { OnboardingStep } from '@prisma/client';
import { OnboardingProgressDto } from '../dto/onboarding-progress.dto';

export class OnboardingMapper {
  static toProgressDto(entity: OnboardingStep): OnboardingProgressDto {
    return {
      crm_connected: entity.crmConnected,
      brand_created: entity.brandCreated,
      subscription_set: entity.subscriptionSet,
      completed: entity.completed,
      current_step: entity.currentStep,
    };
  }
}
