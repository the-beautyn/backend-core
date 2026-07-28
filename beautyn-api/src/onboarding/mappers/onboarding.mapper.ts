import { OnboardingStep } from '@prisma/client';
import { OnboardingProgressDto } from '../dto/onboarding-progress.dto';

export class OnboardingMapper {
  static toProgressDto(entity: OnboardingStep, subscriptionStepEnabled = true): OnboardingProgressDto {
    // BEA-53: rows written before the Subscription step was hidden are stuck at
    // SUBSCRIPTION; while the step is disabled, report them as completed.
    const coerce = !subscriptionStepEnabled && entity.currentStep === 'SUBSCRIPTION';
    return {
      crm_connected: entity.crmConnected,
      brand_created: entity.brandCreated,
      subscription_set: entity.subscriptionSet,
      completed: coerce ? true : entity.completed,
      current_step: coerce ? 'COMPLETED' : entity.currentStep,
    };
  }
}
