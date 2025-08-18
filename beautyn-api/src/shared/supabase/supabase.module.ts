import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SupabaseClient,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('SUPABASE_URL');
        const serviceRoleKey = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
        if (!url || !serviceRoleKey) {
          throw new Error('Supabase env vars missing: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
        }
        return createClient(url, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
      },
    },
  ],
  exports: [SupabaseClient],
})
export class SupabaseModule {}