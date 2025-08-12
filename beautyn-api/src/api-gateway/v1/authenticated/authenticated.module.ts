import { Module } from '@nestjs/common';
import { UserModule } from '../../../user/user.module';
import { UserController } from './user.controller';

@Module({
  imports: [UserModule],
  controllers: [UserController],
})
export class AuthenticatedModule {}
