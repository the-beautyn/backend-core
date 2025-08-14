import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { UserAuthenticatedController } from './v1/authenticated/user/user.authenticated.controller';


@Module({
  imports: [UserModule],
  controllers: [UserAuthenticatedController],
})
export class AuthenticatedApiModule {}
