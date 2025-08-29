import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<any>();
    const provided = (req.headers['x-internal-key'] ?? req.headers['X-Internal-Key']) as string | undefined;
    const expected = process.env.INTERNAL_API_KEY;
    if (!expected) throw new Error('INTERNAL_API_KEY env var is not set');
    if (!provided || String(provided) !== expected) {
      throw new UnauthorizedException('Invalid internal key');
    }
    return true;
  }
}

