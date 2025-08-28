import { Module, DynamicModule } from '@nestjs/common';
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
      providers: [repoProvider],
      exports: [repoProvider, TokenStorageService],
    };
  }
}

