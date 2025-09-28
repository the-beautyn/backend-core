import { Module } from '@nestjs/common';
import { PublicApiModule } from './public-api.module';
import { AuthenticatedApiModule } from './authenticated-api.module';
import { InternalApiModule } from './internal-api.module';

@Module({
  imports: [PublicApiModule, AuthenticatedApiModule, InternalApiModule]
})
export class ApiGatewayModule {}
