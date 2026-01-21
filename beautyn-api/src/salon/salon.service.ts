import { ForbiddenException, Injectable } from '@nestjs/common';
import { CrmSalonChangeStatus, Prisma, Salon as SalonModel, SalonImage as SalonImageModel } from '@prisma/client';
import { PrismaService } from '../shared/database/prisma.service';
import { SalonDto } from './dto/salon.dto';
import { SalonListQuery } from './dto/salon-list.query';
import { SalonImagesSyncDto } from './dto/salon-images-sync.dto';
import { SalonMapper } from './mappers/salon.mapper';
import { ServicesRepository } from '../services/repositories/services.repo';
import { toServiceDto } from '../services/mappers/service.mapper';
import { WorkersRepository } from '../workers/repositories/workers.repository';
import { WorkerMapper } from '../workers/mappers/worker.mapper';
import { toCategoryResponse } from '../categories/mappers/category.mapper';
import { CrmIntegrationService } from '../crm-integration/core/crm-integration.service';
import { SalonInternalSyncDto } from './dto/salon-internal-sync.dto';
import type { SalonData } from '@crm/provider-core';
import { Inject, forwardRef } from '@nestjs/common';

export interface SalonIncludeOptions {
  services?: boolean;
  workers?: boolean;
  categories?: boolean;
  images?: boolean;
}

@Injectable()
export class SalonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly servicesRepo: ServicesRepository,
    private readonly workersRepo: WorkersRepository,
    @Inject(forwardRef(() => CrmIntegrationService)) private readonly crmIntegration: CrmIntegrationService,
  ) {}

  async findById(id: string, include?: SalonIncludeOptions): Promise<SalonDto | null> {
    const salon = await this.prisma.salon.findFirst({ where: { id, deletedAt: null } });
    if (!salon) return null;
    const dto = SalonMapper.toDto(salon);
    await this.applyIncludes(dto, include);
    return dto;
  }

  async list(query: SalonListQuery): Promise<{ items: SalonDto[]; page: number; limit: number; total: number }> {
    const { q, city, country, page = 1, limit = 20 } = query;
    const where: Prisma.SalonWhereInput = { deletedAt: null };
    if (q) {
      where.name = { contains: q, mode: 'insensitive' };
    }
    if (city) {
      where.city = city;
    }
    if (country) {
      where.country = country;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.salon.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.salon.count({ where }),
    ]);

    return {
      items: items.map(SalonMapper.toDto),
      page,
      limit,
      total,
    };
  }

  async listByBrand(brandId: string, include?: SalonIncludeOptions): Promise<SalonDto[]> {
    const salons = await this.prisma.salon.findMany({
      where: { brandId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    const items = salons.map(SalonMapper.toDto);
    if (include) {
      await Promise.all(items.map((dto) => this.applyIncludes(dto, include)));
    }
    return items;
  }

  async upsertFromCrm(input: SalonInternalSyncDto): Promise<SalonDto> {
    const data = this.mapSyncDto(input.salon);
    let salon: SalonModel;

    salon = await this.prisma.salon.upsert({
      where: { id: input.salon_id },
      update: data,
      create: { id: input.salon_id, ...data },
    });

    return SalonMapper.toDto(salon);
  }

  async replaceImages(salonId: string, payload: SalonImagesSyncDto): Promise<{ count: number }> {
    const items = payload.items ?? [];
    return this.prisma.$transaction(async (tx) => {
      await tx.salonImage.deleteMany({ where: { salonId } });
      if (items.length) {
        await tx.salonImage.createMany({
          data: items.map((i) => ({
            salonId,
            imageUrl: i.image_url,
            caption: i.caption,
            sortOrder: i.sort_order,
          })),
        });
      }
      await tx.salon.update({ where: { id: salonId }, data: { imagesCount: items.length } });
      return { count: items.length };
    });
  }

  async listImages(salonId: string) {
    const images: SalonImageModel[] = await this.prisma.salonImage.findMany({
      where: { salonId },
      orderBy: { sortOrder: 'asc' },
    });
    return images.map(SalonMapper.toImageDto);
  }

  async pullSalon(salonId: string) {
    const before = await this.prisma.crmSalonChangeProposal.findMany({
      where: { salonId, status: CrmSalonChangeStatus.pending },
      select: { id: true },
    });
    const beforeIds = new Set(before.map((entry) => entry.id));
    await this.crmIntegration.pullSalonAndDetectChanges(salonId);
    const pending = await this.prisma.crmSalonChangeProposal.findMany({
      where: { salonId, status: CrmSalonChangeStatus.pending },
      orderBy: { detectedAt: 'desc' },
    });
    const added = pending.filter((change) => !beforeIds.has(change.id));
    return added.length ? added : pending;
  }

  async pullSalonForOwner(ownerId: string, salonId: string) {
    const salon = await this.prisma.salon.findFirst({
      where: { id: salonId, ownerUserId: ownerId },
      select: { id: true },
    });
    if (!salon) {
      throw new ForbiddenException('Access denied');
    }
    return this.pullSalon(salonId);
  }

  async pullSalonForOwnerUser(ownerId: string) {
    const salon = await this.prisma.salon.findFirst({
      where: { ownerUserId: ownerId },
      select: { id: true },
    });
    if (!salon) {
      throw new ForbiddenException('Access denied');
    }
    return this.pullSalon(salon.id);
  }

  private async applyIncludes(dto: SalonDto, include?: SalonIncludeOptions): Promise<void> {
    if (!include) return;
    const tasks: Array<Promise<void>> = [];
    if (include.services) {
      tasks.push(
        this.servicesRepo.findBySalon(dto.id).then((services) => {
          const sorted = services.sort((a, b) => {
            const orderDelta = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
            if (orderDelta !== 0) return orderDelta;
            return a.name.localeCompare(b.name);
          });
          dto.services = sorted.map(toServiceDto);
        }),
      );
    }
    if (include.workers) {
      tasks.push(
        this.workersRepo.listBySalon(dto.id).then((workers) => {
          dto.workers = workers.map((worker) => WorkerMapper.toPublicDto(worker));
        }),
      );
    }
    if (include.categories) {
      tasks.push(
        this.prisma.category
          .findMany({
            where: { salonId: dto.id },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          })
          .then((categories) => {
            dto.categories = categories.map(toCategoryResponse);
          }),
      );
    }
    if (include.images) {
      tasks.push(
        this.prisma.salonImage
          .findMany({
            where: { salonId: dto.id },
            orderBy: { sortOrder: 'asc' },
            select: { imageUrl: true },
          })
          .then((images) => {
            dto.images = images.map((image) => image.imageUrl);
          }),
      );
    }
    await Promise.all(tasks);
  }

  private mapSyncDto(input: SalonData): Prisma.SalonUncheckedCreateInput {
    return {
      name: input.name,
      addressLine: input.location?.addressLine,
      city: input.location?.city,
      country: input.location?.country,
      latitude: input.location?.lat !== undefined ? new Prisma.Decimal(input.location?.lat) : undefined,
      longitude: input.location?.lon !== undefined ? new Prisma.Decimal(input.location?.lon) : undefined,
      phone: input.phone,
      email: input.email,
      ratingAvg: null,
      ratingCount: null,
      openHoursJson: input.workingSchedule as any,
      imagesCount: input.imageUrls?.length ?? 0,
      coverImageUrl: input.mainImageUrl,
    };
  }
}
