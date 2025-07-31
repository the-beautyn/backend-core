import { Module } from '@nestjs/common';
import { PublicApiModule } from './public-api.module';

@Module({
  imports: [PublicApiModule],
})
export class ApiGatewayModule {}
