import { Module } from '@nestjs/common';
import { ApiGatewayModule } from './api-gateway/api-gateway.module';
import { SharedModule } from './shared/shared.module';
import { SupabaseModule } from './shared/supabase/supabase.module';

@Module({
  imports: [ApiGatewayModule, SharedModule, SupabaseModule],
})
export class AppModule {}




