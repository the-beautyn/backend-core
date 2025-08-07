import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Module, Global } from '@nestjs/common';

@Global()
@Module({
  providers: [
    {
      provide: SupabaseClient,
      useFactory: () =>
        createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,   // server-side only
          { auth: { autoRefreshToken: false, persistSession: false } },
        ),
    },
  ],
  exports: [SupabaseClient],
})
export class SupabaseModule {}