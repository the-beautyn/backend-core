import { Module, DynamicModule } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TOKEN_STORAGE_REPOSITORY } from './tokens';
import { TokenStorageRepository } from './repository';
import { TokenStorageService } from './token-storage.service';

@Module({
  providers: [TokenStorageService],
  exports: [TokenStorageService],
})
export class TokenStorageModule {
  static register(
    repoProvider: { provide: symbol; useClass: new (...args: any[]) => TokenStorageRepository },
  ): DynamicModule {
    return {
      module: TokenStorageModule,
      providers: [
        // Provide PrismaClient locally so repositories depending on it can be constructed
        { provide: PrismaClient, useFactory: () => new PrismaClient() },
        repoProvider,
      ],
      exports: [repoProvider, TokenStorageService],
    };
  }
}

