import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { UserAuthenticatedController } from './v1/authenticated/user/user.authenticated.controller';
import { OnboardingController } from './v1/authenticated/onboarding.controller';


@Module({
  imports: [UserModule, OnboardingModule],
  controllers: [UserAuthenticatedController, OnboardingController],
})
export class AuthenticatedApiModule {}
