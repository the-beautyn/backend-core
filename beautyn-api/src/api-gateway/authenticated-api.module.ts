import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { CrmSalonChangesModule } from '../crm-salon-changes/crm-salon-changes.module';
import { UserAuthenticatedController } from './v1/authenticated/user.authenticated.controller';
import { OnboardingController } from './v1/authenticated/onboarding.controller';
import { CrmSalonChangesController } from './v1/authenticated/crm-salon-changes.controller';
import { SalonsAuthenticatedController } from './v1/authenticated/salons.authenticated.controller';
import { SalonModule } from '../salon/salon.module';
import { BookingsModule } from '../bookings/bookings.module';
import { BookingsController } from './v1/public/bookings.controller';
import { CategoriesModule } from '../categories/categories.module';
import { CategoriesAuthenticatedController } from './v1/authenticated/categories.controller';
import { ServicesModule } from '../services/services.module';
import { ServicesAuthenticatedController } from './v1/authenticated/services.controller';
import { WorkersModule } from '../workers/workers.module';
import { WorkersAuthenticatedController } from './v1/authenticated/workers.controller';


@Module({
  imports: [UserModule, OnboardingModule, CrmSalonChangesModule, SalonModule, BookingsModule, CategoriesModule, ServicesModule, WorkersModule],
  controllers: [
    UserAuthenticatedController,
    OnboardingController,
    CrmSalonChangesController,
    SalonsAuthenticatedController,
    BookingsController,
    CategoriesAuthenticatedController,
    ServicesAuthenticatedController,
    WorkersAuthenticatedController,
  ],
})
export class AuthenticatedApiModule {}
