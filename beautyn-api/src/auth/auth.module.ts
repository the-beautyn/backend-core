import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SharedModule } from '../shared/shared.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    SharedModule,
    UserModule,
  ],
  providers: [
    AuthService
  ],
  exports: [AuthService],
})
export class AuthModule {}
