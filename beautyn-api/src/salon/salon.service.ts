import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CrmSalonChangeStatus, Prisma, Salon as SalonModel, SalonImage as SalonImageModel } from '@prisma/client';
import { PrismaService } from '../shared/database/prisma.service';
import { SalonDto } from './dto/salon.dto';
import { SalonListQuery } from './dto/salon-list.query';
import { SalonShareDto } from './dto/salon-share.dto';
import { SalonImagesSyncDto } from './dto/salon-images-sync.dto';
import { SalonMapper } from './mappers/salon.mapper';
import { ServicesRepository } from '../services/repositories/services.repo';
import { toServiceDto } from '../services/mappers/service.mapper';
import { WorkersRepository } from '../workers/repositories/workers.repository';
import { WorkerMapper } from '../workers/mappers/worker.mapper';
import { toCategoryResponse } from '../categories/mappers/category.mapper';
import { CrmSalonDiffService } from '../crm-salon-changes/crm-salon-diff.service';
import { SavedSalonsService } from '../saved-salons/saved-salons.service';
import { SalonInternalSyncDto } from './dto/salon-internal-sync.dto';
import type { SalonData } from '@crm/provider-core';

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
    private readonly crmSalonDiff: CrmSalonDiffService,
    private readonly savedSalons: SavedSalonsService,
    private readonly config: ConfigService,
  ) {}

  async findById(
    id: string,
    include?: SalonIncludeOptions,
    userId?: string | null,
  ): Promise<SalonDto | null> {
    const salon = await this.prisma.salon.findFirst({ where: { id, deletedAt: null } });
    if (!salon) return null;
    const dto = SalonMapper.toDto(salon);
    await this.applyIncludes(dto, include);
    if (userId) {
      const saved = await this.savedSalons.isSavedBatch(userId, [id]);
      dto.is_saved = saved.has(id);
    } else {
      dto.is_saved = false;
    }
    return dto;
  }

  async getShare(id: string): Promise<SalonShareDto> {
    const salon = await this.prisma.salon.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true, addressLine: true, city: true, coverImageUrl: true },
    });
    if (!salon) {
      throw new NotFoundException('Salon not found');
    }
    const appUrl = (this.config.get<string>('APP_URL') ?? '').replace(/\/+$/, '');
    if (!appUrl) {
      throw new Error('APP_URL is not configured');
    }
    const descriptionParts = [salon.addressLine, salon.city].filter(
      (part): part is string => Boolean(part),
    );
    return {
      url: `${appUrl}/salon/${salon.id}`,
      title: salon.name ?? 'Beautyn',
      description: descriptionParts.length ? descriptionParts.join(', ') : null,
      image_url: salon.coverImageUrl ?? null,
    };
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
    // `undefined` means the adapter had no gallery data in this payload (the
    // EasyWeek mapper emits it whenever `images` is not an array) — not that
    // the salon has none. Same reading as `CrmSalonDiffService.detectChanges`:
    // an omitted field is skipped, so a partial response never erases a
    // gallery the CRM did not actually retract. An explicit `[]` still clears.
    const imageUrls = input.salon.imageUrls?.filter(
      (url): url is string => typeof url === 'string' && url.length > 0,
    );
    // The count is left out of the write (not set to undefined) when the
    // gallery was omitted, so the stored value survives untouched.
    const data: Prisma.SalonUncheckedCreateInput = {
      ...this.mapSyncDto(input.salon),
      ...(imageUrls !== undefined ? { imagesCount: imageUrls.length } : {}),
    };

    // The gallery rows mirror `imageUrls` exactly as `imagesCount` does: the
    // CRM pull is the source of truth for both, so a salon can never report a
    // count its own gallery cannot back. Replaced wholesale, in CRM order.
    const salon: SalonModel = await this.prisma.$transaction(async (tx) => {
      const row = await tx.salon.upsert({
        where: { id: input.salon_id },
        update: data,
        create: { id: input.salon_id, ...data },
      });
      if (imageUrls !== undefined) {
        await tx.salonImage.deleteMany({ where: { salonId: row.id } });
        if (imageUrls.length) {
          await tx.salonImage.createMany({
            data: imageUrls.map((url, index) => ({
              salonId: row.id,
              imageUrl: url,
              sortOrder: index,
            })),
          });
        }
      }
      return row;
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
    await this.crmSalonDiff.pullAndDetect(salonId);
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
      timezone: input.timezone,
      ratingAvg: null,
      ratingCount: null,
      workingSchedule: input.workingSchedule,
      openHoursJson: Prisma.DbNull,
      // imagesCount is owned by upsertFromCrm, alongside the gallery rows.
      coverImageUrl: input.mainImageUrl,
    };
  }
}
