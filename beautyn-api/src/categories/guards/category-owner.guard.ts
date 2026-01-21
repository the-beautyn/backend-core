import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../shared/database/prisma.service';
import { BrandService } from '../../brand/brand.service';
import { Category } from '@prisma/client';

export interface CategoryRequest extends Request {
  user: { id: string; role?: string | null };
  category?: Category;
}

@Injectable()
export class CategoryOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService, private readonly brandService: BrandService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<CategoryRequest>();
    const userId = req.user?.id;
    const categoryId = req.params?.id;

    if (!userId || !categoryId) {
      throw new NotFoundException('Category not found');
    }

    const category = await (this.prisma as any).category.findFirst({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.brandService.assertUserCanAccessSalon(userId, category.salonId);
    req.category = category;
    return true;
  }
}
