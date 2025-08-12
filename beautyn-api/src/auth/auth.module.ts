import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SharedModule } from '../shared/shared.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    SharedModule,
    UsersModule,
  ],
  providers: [
    AuthService
  ],
  exports: [AuthService],
})
export class AuthModule {}
