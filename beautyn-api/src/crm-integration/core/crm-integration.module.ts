import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { CrmIntegrationService } from './crm-integration.service';
import { CrmAdapterModule } from '@crm/adapter';
import { SyncSchedulerModule } from '@crm/sync-scheduler';
import { TokenStorageModule, PrismaTokenStorageRepository, TOKEN_STORAGE_REPOSITORY } from '@crm/token-storage';
import { AccountRegistryModule, PrismaAccountRegistryRepository, ACCOUNT_REGISTRY_REPOSITORY } from '@crm/account-registry';

@Module({
  imports: [
    SharedModule,
    CrmAdapterModule,
    SyncSchedulerModule,
    TokenStorageModule.register({ provide: TOKEN_STORAGE_REPOSITORY, useClass: PrismaTokenStorageRepository }),
    AccountRegistryModule.register({ provide: ACCOUNT_REGISTRY_REPOSITORY, useClass: PrismaAccountRegistryRepository }),
  ],
  providers: [CrmIntegrationService],
  exports: [CrmIntegrationService],
})
export class CrmIntegrationModule {}
