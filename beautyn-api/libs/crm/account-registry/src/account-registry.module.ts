import { Module, DynamicModule } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AccountRegistryService } from './account-registry.service';
import { AccountRegistryRepository } from './repository';
import { ACCOUNT_REGISTRY_REPOSITORY } from './tokens';


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
      providers: [
        { provide: PrismaClient, useFactory: () => new PrismaClient() },
        repoProvider,
      ],
      exports: [repoProvider, AccountRegistryService],
    };
  }
}

