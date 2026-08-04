import { ApiProperty } from '@nestjs/swagger';
import { OnboardingStepState } from '@prisma/client';

export class OnboardingProgressDto {
  crm_connected: boolean;
  brand_created: boolean;
  subscription_set: boolean;
  completed: boolean;
  @ApiProperty({ enum: OnboardingStepState })
  current_step: OnboardingStepState;
}
