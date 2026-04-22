import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { PhoneVerificationModule } from '../auth/phone-verification.module';

@Module({
  imports: [SharedModule, PhoneVerificationModule],
  providers: [UserRepository, UserService],
  exports: [UserService],
})
export class UserModule {}
