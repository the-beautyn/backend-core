import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BrandRepository } from './brand.repository';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandResponseDto } from './dto/brand-response.dto';
import { BrandMember } from '@prisma/client';
import { SalonDto } from '../salon/dto/salon.dto';
import { SalonService } from '../salon/salon.service';
import { SalonIncludeOptions } from '../salon/salon.service';
import { BrandMemberResponseDto } from './dto/brand-member-response.dto';

@Injectable()
export class BrandService {
  constructor(
    private readonly repo: BrandRepository,
    private readonly salonService: SalonService,
  ) {}

  async createBrand(userId: string, dto: CreateBrandDto): Promise<BrandResponseDto> {
    const existing = await this.repo.listBrandsForUser(userId);
    if (existing.length > 0) {
      throw new BadRequestException('User already has a brand');
    }
    const name = dto.name.trim();
    const brand = await this.repo.createBrandWithOwner(userId, name);
    const withCount = await this.repo.listSalonsByBrand(brand.id);
    return {
      id: brand.id,
      name: brand.name,
      created_at: brand.createdAt,
      updated_at: brand.updatedAt,
      salons_count: withCount?.length ?? 0,
    };
  }

  async listMyBrands(userId: string): Promise<BrandResponseDto[]> {
    const brands = await this.repo.listBrandsForUser(userId);
    if (brands.length === 0) {
      throw new NotFoundException('Brand not found');
    }
    return brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      created_at: brand.createdAt,
      updated_at: brand.updatedAt,
      salons_count: brand._count?.salons ?? 0,
    }));
  }

  async getBrand(userId: string, brandId: string): Promise<BrandResponseDto> {
    await this.assertUserCanAccessBrand(userId, brandId);
    const brand = await this.repo.findBrandById(brandId);
    if (!brand) throw new NotFoundException('Brand not found');
    return {
      id: brand.id,
      name: brand.name,
      created_at: brand.createdAt,
      updated_at: brand.updatedAt,
      salons_count: brand._count?.salons ?? 0,
    };
  }

  async renameBrand(userId: string, brandId: string, dto: UpdateBrandDto): Promise<BrandResponseDto> {
    const membership = await this.assertUserCanAccessBrand(userId, brandId);
    if (membership.role !== 'owner') {
      throw new ForbiddenException('Only owner can rename brand');
    }
    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }
    const brand = await this.repo.updateBrandName(brandId, name);
    return {
      id: brand.id,
      name: brand.name,
      created_at: brand.createdAt,
      updated_at: brand.updatedAt,
    };
  }

  async listBrandSalons(
    userId: string,
    brandId: string,
    include?: SalonIncludeOptions,
  ): Promise<SalonDto[]> {
    await this.assertUserCanAccessBrand(userId, brandId);
    return this.salonService.listByBrand(brandId, include);
  }

  async getBrandMember(userId: string, brandId: string): Promise<BrandMemberResponseDto> {
    const membership = await this.assertUserCanAccessBrand(userId, brandId);
    return {
      id: membership.id,
      brand_id: membership.brandId,
      user_id: membership.userId,
      role: membership.role,
      last_selected_salon_id: membership.lastSelectedSalonId ?? null,
      created_at: membership.createdAt,
    };
  }

  async setLastSelectedSalon(userId: string, brandId: string, salonId: string): Promise<BrandMemberResponseDto> {
    await this.assertUserCanAccessBrand(userId, brandId);
    const salon = await this.repo.findSalonWithBrand(salonId);
    if (!salon || salon.brandId !== brandId) {
      throw new NotFoundException('Salon not found');
    }
    const membership = await this.repo.updateLastSelectedSalon(userId, brandId, salonId);
    return {
      id: membership.id,
      brand_id: membership.brandId,
      user_id: membership.userId,
      role: membership.role,
      last_selected_salon_id: membership.lastSelectedSalonId ?? null,
      created_at: membership.createdAt,
    };
  }

  async assertUserCanAccessBrand(userId: string, brandId: string): Promise<BrandMember> {
    if (!userId || !brandId) throw new NotFoundException('Brand not found');
    const membership = await this.repo.findMembership(userId, brandId);
    if (!membership) throw new NotFoundException('Brand not found');
    return membership;
  }

  async assertUserCanAccessSalon(userId: string, salonId: string): Promise<void> {
    if (!userId || !salonId) throw new NotFoundException('Salon not found');
    const salon = await this.repo.findSalonWithBrand(salonId);
    if (!salon?.brandId) throw new NotFoundException('Salon not found');
    const membership = await this.repo.findMembership(userId, salon.brandId);
    if (!membership) throw new NotFoundException('Salon not found');
  }
}
