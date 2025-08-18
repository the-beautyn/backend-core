import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [SharedModule],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
