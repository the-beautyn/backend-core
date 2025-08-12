import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [SharedModule],
  providers: [UserRepository, UserService],
  exports: [UserService],
})
export class UserModule {}
