import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { CrmSalonChangesModule } from '../crm-salon-changes/crm-salon-changes.module';
import { UserAuthenticatedController } from './v1/authenticated/user.authenticated.controller';
import { OnboardingController } from './v1/authenticated/onboarding.controller';
import { CrmSalonChangesController } from './v1/authenticated/crm-salon-changes.controller';
import { SalonsAuthenticatedController } from './v1/authenticated/salons.authenticated.controller';
import { SalonModule } from '../salon/salon.module';
import { CategoriesModule } from '../categories/categories.module';
import { CategoriesAuthenticatedController } from './v1/authenticated/categories.controller';
import { ServicesModule } from '../services/services.module';
import { ServicesAuthenticatedController } from './v1/authenticated/services.controller';
import { WorkersModule } from '../workers/workers.module';
import { WorkersAuthenticatedController } from './v1/authenticated/workers.controller';
import { AppCategoriesModule } from '../app-categories/app-categories.module';
import { AppCategoriesController } from './v1/authenticated/app-categories.controller';
import { AppCategoryMappingsController } from './v1/authenticated/app-category-mappings.controller';
import { SearchAuthenticatedController } from './v1/authenticated/search.authenticated.controller';
import { SearchModule } from '../search/search.module';
import { AltegioBookingModule } from '../booking/altegio-booking/altegio-booking.module';
import { AltegioBookingAuthenticatedController } from './v1/authenticated/altegio-booking.authenticated.controller';
import { BookingModule } from '../booking/booking.module';
import { EasyweekBookingModule } from '../booking/easyweek-booking/easyweek-booking.module';
import { EasyweekBookingAuthenticatedController } from './v1/authenticated/easyweek-booking.authenticated.controller';
import { ClientBookingsController } from './v1/authenticated/bookings.client.controller';
import { OwnerBookingsController } from './v1/authenticated/bookings.owner.controller';
import { CrmIntegrationModule } from '../crm-integration/core/crm-integration.module';
import { BrandModule } from '../brand/brand.module';
import { BrandController } from './v1/authenticated/brand.controller';
import { SavedSalonsModule } from '../saved-salons/saved-salons.module';
import { SavedSalonsController } from './v1/authenticated/saved-salons.controller';
import { HomeFeedModule } from '../home-feed/home-feed.module';
import { HomeFeedSectionsAdminController } from './v1/authenticated/home-feed-sections.admin.controller';
import { StorageController } from './v1/authenticated/storage.controller';
import { UserSettingsModule } from '../user-settings/user-settings.module';
import { UserSettingsAuthenticatedController } from './v1/authenticated/user-settings.authenticated.controller';


@Module({
  imports: [UserModule, UserSettingsModule, OnboardingModule, CrmSalonChangesModule, SalonModule, CategoriesModule, ServicesModule, WorkersModule, AppCategoriesModule, SearchModule, AltegioBookingModule, BookingModule, EasyweekBookingModule, CrmIntegrationModule, BrandModule, SavedSalonsModule, HomeFeedModule],
  controllers: [
    UserAuthenticatedController,
    UserSettingsAuthenticatedController,
    OnboardingController,
    CrmSalonChangesController,
    SalonsAuthenticatedController,
    CategoriesAuthenticatedController,
    ServicesAuthenticatedController,
    WorkersAuthenticatedController,
    AppCategoriesController,
    AppCategoryMappingsController,
    SearchAuthenticatedController,
    AltegioBookingAuthenticatedController,
    EasyweekBookingAuthenticatedController,
    ClientBookingsController,
    OwnerBookingsController,
    BrandController,
    SavedSalonsController,
    HomeFeedSectionsAdminController,
    StorageController,
  ],
})
export class AuthenticatedApiModule {}
