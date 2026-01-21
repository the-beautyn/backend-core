import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { BrandService } from '../brand.service';

@Injectable()
export class SalonAccessGuard implements CanActivate {
  constructor(private readonly brandService: BrandService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: { id: string } }>();
    const userId = req.user?.id;
    const salonId = req.params?.salonId;
    if (!userId || !salonId) {
      throw new NotFoundException('Salon not found');
    }
    await this.brandService.assertUserCanAccessSalon(userId, salonId);
    return true;
  }
}
