import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

export interface WorkerServiceLinkRecord {
  id: string;
  workerId: string | null;
  remoteWorkerId: string | null;
}

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
  workerLinks: WorkerServiceLinkRecord[];
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
  isActive: boolean;
}

@Injectable()
export class ServicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async paginate(salonId: string, skip: number, take: number): Promise<{ items: ServiceRecord[]; total: number }> {
    const prismaAny = this.prisma as any;
    const [rawItems, total] = await this.prisma.$transaction([
      prismaAny.service.findMany({
        where: { salonId },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take,
        include: { workerLinks: true },
      }),
      prismaAny.service.count({ where: { salonId } }),
    ]);
    const items = (rawItems as any[]).map((row) => this.mapRecord(row));
    return { items, total };
  }

  async findByIdWithinSalon(serviceId: string, salonId: string): Promise<ServiceRecord | null> {
    const row = await (this.prisma as any).service.findFirst({
      where: { id: serviceId, salonId },
      include: { workerLinks: true },
    });
    return row ? this.mapRecord(row) : null;
  }

  async findById(serviceId: string): Promise<ServiceRecord | null> {
    const row = await (this.prisma as any).service.findUnique({
      where: { id: serviceId },
      include: { workerLinks: true },
    });
    return row ? this.mapRecord(row) : null;
  }

  async findBySalon(salonId: string): Promise<ServiceRecord[]> {
    const rows = await (this.prisma as any).service.findMany({
      where: { salonId },
      include: { workerLinks: true },
    });
    return rows.map((row: any) => this.mapRecord(row));
  }

  async findByCrmExternalId(salonId: string, crmServiceId: string): Promise<ServiceRecord | null> {
    const row = await (this.prisma as any).service.findFirst({
      where: { salonId, crmServiceId },
      include: { workerLinks: true },
    });
    return row ? this.mapRecord(row) : null;
  }

  async findByNameInsensitive(salonId: string, nameLower: string): Promise<ServiceRecord | null> {
    const prismaAny = this.prisma as any;
    const row = await prismaAny.service.findFirst({
      where: { salonId, name: { equals: nameLower, mode: 'insensitive' } },
      include: { workerLinks: true },
    });
    return row ? this.mapRecord(row) : null;
  }

  async create(data: ServiceUpsertData): Promise<ServiceRecord> {
    const row = await (this.prisma as any).service.create({ data, include: { workerLinks: true } });
    return this.mapRecord(row);
  }

  async update(serviceId: string, data: Partial<ServiceUpsertData>): Promise<ServiceRecord> {
    const row = await (this.prisma as any).service.update({
      where: { id: serviceId },
      data,
      include: { workerLinks: true },
    });
    return this.mapRecord(row);
  }

  async delete(serviceId: string): Promise<void> {
    await (this.prisma as any).service.delete({ where: { id: serviceId } });
  }

  async deleteMany(ids: string[]): Promise<number> {
    if (!ids.length) return 0;
    const res = await (this.prisma as any).service.deleteMany({ where: { id: { in: ids } } });
    return res.count ?? 0;
  }

  private mapRecord(row: any): ServiceRecord {
    const links: WorkerServiceLinkRecord[] = Array.isArray(row.workerLinks)
      ? row.workerLinks.map((link: any) => ({
          id: link.id,
          workerId: link.workerId ?? null,
          remoteWorkerId: link.remoteWorkerId ?? null,
        }))
      : [];
    const workerIds = links
      .map((link) => link.workerId ?? link.remoteWorkerId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    return {
      id: row.id,
      salonId: row.salonId,
      categoryId: row.categoryId ?? null,
      crmServiceId: row.crmServiceId ?? null,
      name: row.name,
      description: row.description ?? null,
      duration: row.duration,
      price: row.price,
      currency: row.currency,
      sortOrder: row.sortOrder ?? null,
      workerIds,
      workerLinks: links,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}


