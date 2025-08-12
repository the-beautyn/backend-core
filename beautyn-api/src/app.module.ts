import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiGatewayModule } from './api-gateway/api-gateway.module';
import { SharedModule } from './shared/shared.module';
import { SupabaseModule } from './shared/supabase/supabase.module';

@Module({
  imports: [ApiGatewayModule, SharedModule, SupabaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
