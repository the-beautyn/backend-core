import { CanActivate, ExecutionContext, ForbiddenException, Injectable, mixin, Type } from '@nestjs/common';

/**
 * Factory that produces a guard checking the authenticated user's role against the allowed list.
 * Usage: `@UseGuards(JwtAuthGuard, RolesGuard('owner'))`
 */
export function RolesGuard(...roles: string[]): Type<CanActivate> {
  class RolesGuardMixin implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest();
      const userRole: string | null | undefined = request?.user?.role;
      if (!userRole || !roles.includes(userRole)) {
        throw new ForbiddenException('Forbidden resource');
      }
      return true;
    }
  }

  return mixin(RolesGuardMixin);
}

@Injectable()
export class OwnerRolesGuard extends (RolesGuard('owner') as unknown as Type<CanActivate>) {}

@Injectable()
export class AdminRolesGuard extends (RolesGuard('admin') as unknown as Type<CanActivate>) {}
