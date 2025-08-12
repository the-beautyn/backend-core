import { Module } from '@nestjs/common';
import { PublicApiModule } from './public-api.module';
import { AuthenticatedModule } from './v1/authenticated/authenticated.module'; // TODO: ensure this module is imported when enabling authenticated routes

@Module({
  imports: [PublicApiModule, AuthenticatedModule], // TODO: register AuthenticatedModule for protected endpoints
})
export class ApiGatewayModule {}
