import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { ServicesModule } from '../services/services.module';
import { SalonModule } from '../salon/salon.module';
import { AuthPublicController } from './v1/public/auth.public.controller';
import { HealthController } from './v1/public/health.controller';
import { ServicesController } from './v1/public/services.controller';
import { CategoriesModule } from '../categories/categories.module';
import { CategoriesPublicController } from './v1/public/categories.controller';
import { WorkersModule } from '../workers/workers.module';
import { WorkersController } from './v1/public/workers.controller';
import { SalonsController } from './v1/public/salons.controller';
import { AltegioWebhookController } from './v1/public/altegio-webhook.controller';
import { AltegioWebhookService } from '../crm-integration/webhooks/altegio-webhook.service';
import { AltegioPartnerClient } from '../crm-integration/clients/altegio-partner.client';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { SyncTriggerService } from '../crm-integration/core/sync-trigger.service';
import { AppCategoriesModule } from '../app-categories/app-categories.module';
import { AppCategoriesPublicController } from './v1/public/app-categories.public.controller';
import { SearchModule } from '../search/search.module';
import { SearchPublicController } from './v1/public/search.public.controller';

@Module({
  imports: [SharedModule, AuthModule, ServicesModule, WorkersModule, SalonModule, OnboardingModule, CategoriesModule, AppCategoriesModule, SearchModule],
  controllers: [
    AuthPublicController,
    HealthController,
    ServicesController,
    WorkersController,
    SalonsController,
    AltegioWebhookController,
    CategoriesPublicController,
    AppCategoriesPublicController,
    SearchPublicController,
  ],
  providers: [AltegioWebhookService, SyncTriggerService, AltegioPartnerClient],
})
export class PublicApiModule {}
