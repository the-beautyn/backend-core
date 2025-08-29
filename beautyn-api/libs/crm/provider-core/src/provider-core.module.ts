import { Module } from '@nestjs/common';
import { ProviderFactory } from './provider.factory';
import { CapabilityRegistryModule } from '@crm/capability-registry';
import { TokenStorageModule } from '@crm/token-storage';
import { AccountRegistryModule } from '@crm/account-registry';

@Module({
  imports: [
    CapabilityRegistryModule,
    TokenStorageModule,
    AccountRegistryModule,
    // TokenStorageModule/AccountRegistryModule are dynamic; the app should register concrete repos.
  ],
  providers: [ProviderFactory],
  exports: [ProviderFactory],
})
export class ProviderCoreModule {}

