import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { EnvelopeExceptionFilter } from './filters/envelope-exception.filter';
import { AppConfigService } from './services/app-config.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminRolesGuard, OwnerRolesGuard, ClientRolesGuard } from './guards/roles.guard';
import { PrismaService } from './database/prisma.service';
import { HashService } from './services/hash.service';
import { SalonOwnerGuard } from './guards/salon-owner.guard';

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
    ClientRolesGuard,
    SalonOwnerGuard,
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
    ClientRolesGuard,
    SalonOwnerGuard,
    PrismaService,
    HashService,
  ],
})
export class SharedModule {}
