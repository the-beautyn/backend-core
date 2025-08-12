import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class UserOwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const paramId = request.params?.id;
    const userId = request.user?.id;
    if (!paramId) {
      throw new BadRequestException('Missing required parameter: id');
    }
    return paramId === userId;
  }
}
