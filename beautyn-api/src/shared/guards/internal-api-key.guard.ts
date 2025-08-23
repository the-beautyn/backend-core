import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const key = req.headers['x-internal-key'];
    const internalApiKey = process.env.INTERNAL_API_KEY;
    if (!internalApiKey || internalApiKey.trim() === '') {
      return false;
    }
    return key === internalApiKey;
  }
}


