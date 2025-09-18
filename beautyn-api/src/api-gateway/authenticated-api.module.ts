import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { CrmSalonChangesModule } from '../crm-salon-changes/crm-salon-changes.module';
import { UserAuthenticatedController } from './v1/authenticated/user.authenticated.controller';
import { OnboardingController } from './v1/authenticated/onboarding.controller';
import { CrmSalonChangesController } from './v1/authenticated/crm-salon-changes.controller';
import { SalonsAuthenticatedController } from './v1/authenticated/salons.authenticated.controller';
import { SalonModule } from '../salon/salon.module';


@Module({
  imports: [UserModule, OnboardingModule, CrmSalonChangesModule, SalonModule],
  controllers: [UserAuthenticatedController, OnboardingController, CrmSalonChangesController, SalonsAuthenticatedController],
})
export class AuthenticatedApiModule {}
