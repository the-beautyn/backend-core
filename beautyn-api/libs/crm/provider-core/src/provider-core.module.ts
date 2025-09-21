import { Module } from '@nestjs/common';
import { ProviderFactory } from './provider.factory';
import { CapabilityRegistryModule } from '@crm/capability-registry';
import { TokenStorageModule, PrismaTokenStorageRepository, TOKEN_STORAGE_REPOSITORY } from '@crm/token-storage';
import { AccountRegistryModule, PrismaAccountRegistryRepository, ACCOUNT_REGISTRY_REPOSITORY } from '@crm/account-registry';

@Module({
  imports: [
    CapabilityRegistryModule,
    TokenStorageModule.register({ provide: TOKEN_STORAGE_REPOSITORY, useClass: PrismaTokenStorageRepository }),
    AccountRegistryModule.register({ provide: ACCOUNT_REGISTRY_REPOSITORY, useClass: PrismaAccountRegistryRepository }),
    // TokenStorageModule/AccountRegistryModule are dynamic; the app should register concrete repos.
  ],
  providers: [ProviderFactory],
  exports: [ProviderFactory],
})
export class ProviderCoreModule {}

