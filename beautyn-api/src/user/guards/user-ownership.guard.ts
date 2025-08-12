import { CanActivate, ExecutionContext, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class UserOwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const paramId = request.params?.id;
    const userId = request.user?.id;
    if (!paramId) {
      throw new BadRequestException('Missing required parameter: id');
    }
    if (!request.user || !userId) {
      return false;
    }
    return paramId === userId;
  }
}
