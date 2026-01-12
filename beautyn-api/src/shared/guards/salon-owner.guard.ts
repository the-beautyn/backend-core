import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../database/prisma.service';

export interface SalonOwnerRequest extends Request {
  user?: { id?: string; role?: string | null };
  salon?: { id: string; provider: string | null };
}

@Injectable()
export class SalonOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<SalonOwnerRequest>();
    const userId = req.user?.id;
    const salonId = req.params?.salonId;

    if (!userId || !salonId) {
      throw new NotFoundException('Salon not found');
    }

    const salon = await this.prisma.salon.findFirst({
      where: { id: salonId, ownerUserId: userId, deletedAt: null },
      select: { id: true, provider: true },
    });

    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    req.salon = salon;
    return true;
  }
}
