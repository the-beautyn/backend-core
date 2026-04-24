import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { PhoneVerificationModule } from '../auth/phone-verification.module';
import { UserSettingsModule } from '../user-settings/user-settings.module';

@Module({
  imports: [SharedModule, PhoneVerificationModule, UserSettingsModule],
  providers: [UserRepository, UserService],
  exports: [UserService],
})
export class UserModule {}
