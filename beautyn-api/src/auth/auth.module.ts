import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PhoneVerificationModule } from './phone-verification.module';
import { SharedModule } from '../shared/shared.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    SharedModule,
    UserModule,
    ConfigModule,
    PhoneVerificationModule,
  ],
  providers: [AuthService],
  exports: [AuthService, PhoneVerificationModule],
})
export class AuthModule {}
