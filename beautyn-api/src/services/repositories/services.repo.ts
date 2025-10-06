import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

export interface ServiceRecord {
  id: string;
  salonId: string;
  categoryId: string | null;
  crmServiceId: string | null;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  currency: string;
  sortOrder: number | null;
  workerIds: string[];
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ServiceUpsertData {
  salonId: string;
  crmServiceId: string | null;
  categoryId: string | null;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  currency: string;
  sortOrder: number | null;
  workerIds: string[];
  isActive: boolean;
}

@Injectable()
export class ServicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async paginate(salonId: string, skip: number, take: number): Promise<{ items: ServiceRecord[]; total: number }> {
    const prismaAny = this.prisma as any;
    const [items, total] = await this.prisma.$transaction([
      prismaAny.service.findMany({
        where: { salonId },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take,
      }),
      prismaAny.service.count({ where: { salonId } }),
    ]);
    return { items, total };
  }

  async findByIdWithinSalon(serviceId: string, salonId: string): Promise<ServiceRecord | null> {
    return (this.prisma as any).service.findFirst({ where: { id: serviceId, salonId } });
  }

  async findById(serviceId: string): Promise<ServiceRecord | null> {
    return (this.prisma as any).service.findUnique({ where: { id: serviceId } });
  }

  async findBySalon(salonId: string): Promise<ServiceRecord[]> {
    return (this.prisma as any).service.findMany({ where: { salonId } });
  }

  async findByCrmExternalId(salonId: string, crmServiceId: string): Promise<ServiceRecord | null> {
    return (this.prisma as any).service.findFirst({ where: { salonId, crmServiceId } });
  }

  async findByNameInsensitive(salonId: string, nameLower: string): Promise<ServiceRecord | null> {
    const prismaAny = this.prisma as any;
    return prismaAny.service.findFirst({ where: { salonId, name: { equals: nameLower, mode: 'insensitive' } } });
  }

  async create(data: ServiceUpsertData): Promise<ServiceRecord> {
    return (this.prisma as any).service.create({ data });
  }

  async update(serviceId: string, data: Partial<ServiceUpsertData>): Promise<ServiceRecord> {
    return (this.prisma as any).service.update({ where: { id: serviceId }, data });
  }

  async delete(serviceId: string): Promise<void> {
    await (this.prisma as any).service.delete({ where: { id: serviceId } });
  }

  async deleteMany(ids: string[]): Promise<number> {
    if (!ids.length) return 0;
    const res = await (this.prisma as any).service.deleteMany({ where: { id: { in: ids } } });
    return res.count ?? 0;
  }
}



