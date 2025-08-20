import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { OnboardingService } from './onboarding.service';
import { EasyWeekDiscoveryClient, HttpEasyWeekDiscoveryClient } from './clients/easyweek-discovery.client';
import { CrmIntegrationClient } from './clients/crm-integration.client';
import { HttpCrmIntegrationClient } from './clients/http-crm-integration.client';
import { NoopCrmIntegrationClient } from './clients/noop-crm-integration.client';

@Module({
  imports: [SharedModule],
  providers: [
    OnboardingService,
    { provide: EasyWeekDiscoveryClient, useClass: HttpEasyWeekDiscoveryClient },
    {
      provide: CrmIntegrationClient,
      useFactory: () => {
        const hasHttp = !!process.env.CRM_INTEGRATION_BASE_URL && !!process.env.INTERNAL_API_KEY;
        return hasHttp ? new HttpCrmIntegrationClient() : new NoopCrmIntegrationClient();
      },
    },
  ],
  exports: [OnboardingService],
})
export class OnboardingModule {}
