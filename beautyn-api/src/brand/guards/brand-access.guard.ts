import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { BrandService } from '../brand.service';
import { BrandMember } from '@prisma/client';

export interface BrandRequest extends Request {
  user?: { id: string };
  brandMember?: BrandMember;
}

@Injectable()
export class BrandAccessGuard implements CanActivate {
  constructor(private readonly brandService: BrandService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<BrandRequest>();
    const userId = req.user?.id;
    const brandId = req.params?.brandId;
    if (!userId || !brandId) {
      throw new NotFoundException('Brand not found');
    }
    const membership = await this.brandService.assertUserCanAccessBrand(userId, brandId);
    req.brandMember = membership;
    return true;
  }
}
