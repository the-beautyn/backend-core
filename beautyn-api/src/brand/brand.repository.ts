import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service';
import { Brand, BrandMember, Salon } from '@prisma/client';

type BrandWithCount = Brand & { _count: { salons: number } };

@Injectable()
export class BrandRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMembership(userId: string, brandId: string): Promise<BrandMember | null> {
    return this.prisma.brandMember.findFirst({ where: { userId, brandId } });
  }

  async createBrandWithOwner(userId: string, name: string): Promise<Brand> {
    return this.prisma.$transaction(async (tx) => {
      const brand = await tx.brand.create({ data: { name } });
      const firstSalon = await tx.salon.findFirst({
        where: { ownerUserId: userId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      await tx.brandMember.create({
        data: {
          brandId: brand.id,
          userId,
          role: 'owner',
          lastSelectedSalonId: firstSalon?.id ?? null,
        },
      });
      await tx.salon.updateMany({
        where: { ownerUserId: userId, brandId: null },
        data: { brandId: brand.id },
      });
      await tx.onboardingStep.updateMany({
        where: { userId, currentStep: 'BRAND' },
        data: { brandCreated: true, currentStep: 'SUBSCRIPTION' },
      });
      return brand;
    });
  }

  async listBrandsForUser(userId: string): Promise<BrandWithCount[]> {
    return this.prisma.brand.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { salons: true } } },
    });
  }

  async findBrandById(brandId: string): Promise<BrandWithCount | null> {
    return this.prisma.brand.findUnique({
      where: { id: brandId },
      include: { _count: { select: { salons: true } } },
    });
  }

  async updateBrandName(brandId: string, name: string): Promise<Brand> {
    return this.prisma.brand.update({ where: { id: brandId }, data: { name } });
  }

  async listSalonsByBrand(brandId: string): Promise<Salon[]> {
    return this.prisma.salon.findMany({
      where: { brandId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findSalonWithBrand(salonId: string): Promise<Pick<Salon, 'id' | 'brandId'> | null> {
    return this.prisma.salon.findUnique({
      where: { id: salonId },
      select: { id: true, brandId: true },
    });
  }

  async updateLastSelectedSalon(userId: string, brandId: string, salonId: string | null): Promise<BrandMember> {
    return this.prisma.brandMember.update({
      where: { brandId_userId: { brandId, userId } },
      data: { lastSelectedSalonId: salonId },
    });
  }
}
