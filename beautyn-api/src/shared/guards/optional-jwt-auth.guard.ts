import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      request.user = null;
      return true;
    }

    const token = authHeader.split(' ')[1];

    try {
      const { data: { user }, error } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        request.user = null;
        return true;
      }

      request.user = {
        ...user,
        id: user.id,
        role: user.user_metadata?.user_role || null,
      };
    } catch {
      request.user = null;
    }

    return true;
  }
}
