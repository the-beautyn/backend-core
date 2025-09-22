import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../shared/database/prisma.service';
import { Category } from '@prisma/client';

export interface CategoryRequest extends Request {
  user: { id: string; role?: string | null };
  category?: Category;
  ownerSalon?: { id: string; provider: string | null };
}

@Injectable()
export class CategoryOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<CategoryRequest>();
    const userId = req.user?.id;
    const categoryId = req.params?.id;

    if (!userId || !categoryId) {
      throw new NotFoundException('Category not found');
    }

    const salon = await (this.prisma as any).salon.findFirst({
      where: { ownerUserId: userId, deletedAt: null },
      select: { id: true, provider: true },
    });

    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    const category = await (this.prisma as any).category.findFirst({
      where: { id: categoryId, salonId: salon.id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    req.category = category;
    req.ownerSalon = salon;
    return true;
  }
}

