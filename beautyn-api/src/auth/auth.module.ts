import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { SharedModule } from '../shared/shared.module';
import { AppConfigService } from '../shared/services/app-config.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { RevokedTokenRepository } from './revocation/revoked-token.repository';
import { RevokedTokenService } from './revocation/revoked-token.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [SharedModule],
      inject: [AppConfigService],
      useFactory: (cfg: AppConfigService) => ({
        secret: cfg.jwtSecret,
        signOptions: { expiresIn: cfg.jwtExpiresIn },
      }),
    }),
    PassportModule,
    SharedModule,
    UsersModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    RevokedTokenRepository,
    RevokedTokenService,
  ],
  exports: [AuthService, RevokedTokenService],
})
export class AuthModule {}
