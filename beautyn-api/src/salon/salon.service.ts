import { Injectable } from '@nestjs/common';
import { Prisma, Salon as SalonModel, SalonImage as SalonImageModel } from '@prisma/client';
import { PrismaService } from '../shared/database/prisma.service';
import { SalonDto } from './dto/salon.dto';
import { SalonListQuery } from './dto/salon-list.query';
import { SalonSyncDto } from './dto/salon-sync.dto';
import { SalonImagesSyncDto } from './dto/salon-images-sync.dto';
import { SalonMapper } from './mappers/salon.mapper';

@Injectable()
export class SalonService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<SalonDto | null> {
    const salon = await this.prisma.salon.findFirst({ where: { id, deletedAt: null } });
    return salon ? SalonMapper.toDto(salon) : null;
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

  async upsertFromCrm(input: SalonSyncDto & { crm_id?: string }): Promise<SalonDto> {
    const data = this.mapSyncDto(input);
    let salon: SalonModel;

    if (input.crm_id) {
      const existing = await this.prisma.salon.findFirst({ where: { crmId: input.crm_id } });
      if (existing) {
        salon = await this.prisma.salon.update({ where: { id: existing.id }, data });
        return SalonMapper.toDto(salon);
      }
    }

    if (input.id) {
      salon = await this.prisma.salon.upsert({
        where: { id: input.id },
        update: data,
        create: { id: input.id, ...data },
      });
    } else {
      salon = await this.prisma.salon.create({ data });
    }

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

  private mapSyncDto(input: SalonSyncDto & { crm_id?: string }): Prisma.SalonUncheckedCreateInput {
    return {
      crmId: input.crm_id,
      name: input.name,
      addressLine: input.address_line,
      city: input.city,
      country: input.country,
      latitude: input.latitude !== undefined ? new Prisma.Decimal(input.latitude) : undefined,
      longitude: input.longitude !== undefined ? new Prisma.Decimal(input.longitude) : undefined,
      phone: input.phone,
      email: input.email,
      ratingAvg: input.rating_avg !== undefined ? new Prisma.Decimal(input.rating_avg) : undefined,
      ratingCount: input.rating_count,
      openHoursJson: input.open_hours_json as any,
      imagesCount: input.images_count,
      coverImageUrl: input.cover_image_url,
    };
  }
}
