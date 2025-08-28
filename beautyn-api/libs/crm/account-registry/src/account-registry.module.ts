import { Module, DynamicModule } from '@nestjs/common';
import { AccountRegistryService } from './account-registry.service';
import { AccountRegistryRepository } from './repository';

export const ACCOUNT_REGISTRY_REPOSITORY = Symbol('ACCOUNT_REGISTRY_REPOSITORY');

@Module({
  providers: [AccountRegistryService],
  exports: [AccountRegistryService],
})
export class AccountRegistryModule {
  static register(
    repoProvider: { provide: symbol; useClass: new (...args: any[]) => AccountRegistryRepository },
  ): DynamicModule {
    return {
      module: AccountRegistryModule,
      providers: [repoProvider],
      exports: [repoProvider, AccountRegistryService],
    };
  }
}

