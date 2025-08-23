import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { OnboardingService } from './onboarding.service';
import { CrmProvidersRegistry } from './providers/crm-providers.registry';
import { EasyWeekDiscoveryClient, HttpEasyWeekDiscoveryClient } from './clients/easyweek-discovery.client';
import { CrmIntegrationService } from '../crm-integration/core/crm-integration.service';

@Module({
  imports: [SharedModule],
  providers: [
    OnboardingService,
    CrmProvidersRegistry,
    CrmIntegrationService,
    { provide: EasyWeekDiscoveryClient, useClass: HttpEasyWeekDiscoveryClient },
  ],
  exports: [OnboardingService, CrmProvidersRegistry],
})
export class OnboardingModule {}
