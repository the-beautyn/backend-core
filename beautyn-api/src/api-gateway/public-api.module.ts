import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ServicesModule } from '../services/services.module';
import { SalonModule } from '../salon/salon.module';
import { AuthPublicController } from './v1/public/auth.public.controller';
import { HealthController } from './v1/public/health.controller';
import { ServicesController } from './v1/public/services.controller';
import { WorkersModule } from '../workers/workers.module';
import { WorkersController } from './v1/public/workers.controller';
import { SalonsController } from './v1/public/salons.controller';
import { AltegioWebhookController } from './v1/public/altegio-webhook.controller';
import { AltegioWebhookService } from '../crm-integration/webhooks/altegio-webhook.service';
import { AltegioPartnerClient } from '../crm-integration/clients/altegio-partner.client';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { CrmIntegrationService } from '../crm-integration/core/crm-integration.service';
import { SyncTriggerService } from '../crm-integration/core/sync-trigger.service';

@Module({
  imports: [AuthModule, ServicesModule, WorkersModule, SalonModule, OnboardingModule],
  controllers: [AuthPublicController, HealthController, ServicesController, WorkersController, SalonsController, AltegioWebhookController],
  providers: [AltegioWebhookService, CrmIntegrationService, SyncTriggerService, AltegioPartnerClient],
})
export class PublicApiModule {}
