import { Module } from '@nestjs/common';
import { PublicApiModule } from './public-api.module';
import { AuthenticatedApiModule } from './authenticated-api.module';

@Module({
  imports: [PublicApiModule, AuthenticatedApiModule]
})
export class ApiGatewayModule {}
