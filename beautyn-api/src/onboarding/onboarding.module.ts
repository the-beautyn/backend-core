import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { CrmAdapterModule } from '@crm/adapter';
import { OnboardingService } from './onboarding.service';
import { CrmProvidersRegistry } from './providers/crm-providers.registry';
import { EasyWeekDiscoveryClient, HttpEasyWeekDiscoveryClient } from './clients/easyweek-discovery.client';
import { CrmIntegrationService } from '../crm-integration/core/crm-integration.service';
import { TokenStorageModule, PrismaTokenStorageRepository, TOKEN_STORAGE_REPOSITORY } from '@crm/token-storage';
import { AccountRegistryModule, PrismaAccountRegistryRepository, ACCOUNT_REGISTRY_REPOSITORY } from '@crm/account-registry';
import { CrmSalonChangesModule } from '../crm-salon-changes/crm-salon-changes.module';

@Module({
  imports: [
    SharedModule,
    CrmAdapterModule,
    TokenStorageModule.register({ provide: TOKEN_STORAGE_REPOSITORY, useClass: PrismaTokenStorageRepository }),
    AccountRegistryModule.register({ provide: ACCOUNT_REGISTRY_REPOSITORY, useClass: PrismaAccountRegistryRepository }),
    CrmSalonChangesModule,
  ],
  providers: [
    OnboardingService,
    CrmProvidersRegistry,
    CrmIntegrationService,
    { provide: EasyWeekDiscoveryClient, useClass: HttpEasyWeekDiscoveryClient },
  ],
  exports: [OnboardingService, CrmProvidersRegistry, CrmIntegrationService],
})
export class OnboardingModule {}
