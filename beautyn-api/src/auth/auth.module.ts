import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { SharedModule } from '../shared/shared.module';
import { AppConfigService } from '../shared/services/app-config.service';
import { JwtStrategy } from './strategies/jwt.strategy';

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
  ],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
