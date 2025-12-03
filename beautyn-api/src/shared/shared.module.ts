import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { EnvelopeExceptionFilter } from './filters/envelope-exception.filter';
import { AppConfigService } from './services/app-config.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminRolesGuard, OwnerRolesGuard } from './guards/roles.guard';
import { PrismaService } from './database/prisma.service';
import { HashService } from './services/hash.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Check env-specific first; if it exists, load it; otherwise fall back to base
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'dev'}`,
        '.env',
      ],
      ignoreEnvFile: false,
    }),
  ],
  providers: [
    AppConfigService,
    TransformInterceptor,
    JwtAuthGuard,
    OwnerRolesGuard,
    AdminRolesGuard,
    PrismaService,
    HashService,
    { provide: APP_FILTER, useClass: EnvelopeExceptionFilter },
  ],
  exports: [
    AppConfigService,
    TransformInterceptor,
    JwtAuthGuard,
    OwnerRolesGuard,
    AdminRolesGuard,
    PrismaService,
    HashService,
  ],
})
export class SharedModule {}
