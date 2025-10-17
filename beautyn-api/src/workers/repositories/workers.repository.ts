import { Injectable } from '@nestjs/common';
import { Prisma, Worker, WorkerService as WorkerServiceLink } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';

export interface WorkerEntityInput {
  crmWorkerId?: string | null;
  firstName: string;
  lastName: string;
  position?: string | null;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  isActive?: boolean;
}

type WorkerWithServices = Worker & { services: WorkerServiceLink[] };

@Injectable()
export class WorkersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdWithinSalon(workerId: string, salonId: string): Promise<WorkerWithServices | null> {
    return this.prisma.worker.findFirst({
      where: { id: workerId, salonId },
      include: { services: true },
    });
  }

  async findByCrmId(salonId: string, crmWorkerId: string): Promise<Worker | null> {
    return this.prisma.worker.findFirst({ where: { salonId, crmWorkerId } });
  }

  async listBySalon(salonId: string): Promise<WorkerWithServices[]> {
    return this.prisma.worker.findMany({
      where: { salonId },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: { services: true },
    });
  }

  async paginate(
    salonId: string,
    params: { skip: number; take: number; search?: string | null; isActive?: boolean | null },
  ): Promise<{ items: WorkerWithServices[]; total: number }> {
    const where: Prisma.WorkerWhereInput = { salonId };
    if (params.search) {
      const query = params.search.trim();
      if (query.length > 0) {
        where.OR = [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { position: { contains: query, mode: 'insensitive' } },
        ];
      }
    }
    if (typeof params.isActive === 'boolean') {
      where.isActive = params.isActive;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.worker.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: params.skip,
        take: params.take,
        include: { services: true },
      }),
      this.prisma.worker.count({ where }),
    ]);
    return { items, total };
  }

  async upsertFromCrm(salonId: string, payload: WorkerEntityInput & { id?: string }): Promise<WorkerWithServices> {
    let saved: WorkerWithServices;
    if (payload.id) {
      saved = (await this.prisma.worker.update({
        where: { id: payload.id },
        data: this.mapToUpdateData(payload),
        include: { services: true },
      })) as WorkerWithServices;
      await this.syncWorkerServiceLinks(salonId, saved);
      return saved;
    }

    if (payload.crmWorkerId) {
      const existing = await this.findByCrmId(salonId, payload.crmWorkerId);
      if (existing) {
        saved = (await this.prisma.worker.update({
          where: { id: existing.id },
          data: this.mapToUpdateData(payload),
          include: { services: true },
        })) as WorkerWithServices;
        await this.syncWorkerServiceLinks(salonId, saved);
        return saved;
      }
    }

    saved = (await this.prisma.worker.create({
      data: this.mapToCreateData(salonId, payload),
      include: { services: true },
    })) as WorkerWithServices;
    await this.syncWorkerServiceLinks(salonId, saved);
    return saved;
  }

  async bulkRebase(
    salonId: string,
    workers: Array<WorkerEntityInput & { id?: string }>,
  ): Promise<{ upserted: number; deleted: number; current: WorkerWithServices[] }> {
    const existing = await this.listBySalon(salonId);
    const keep = new Set<string>();
    let upserted = 0;

    for (const payload of workers) {
      const saved = await this.upsertFromCrm(salonId, payload);
      keep.add(saved.id);
      upserted++;
    }

    const toDelete = existing.filter((w) => !keep.has(w.id));
    let deleted = 0;
    if (toDelete.length) {
      await this.prisma.worker.deleteMany({ where: { id: { in: toDelete.map((w) => w.id) } } });
      deleted = toDelete.length;
    }

    const current = await this.listBySalon(salonId);
    return { upserted, deleted, current };
  }

  async create(salonId: string, payload: WorkerEntityInput): Promise<WorkerWithServices> {
    const worker = (await this.prisma.worker.create({
      data: this.mapToCreateData(salonId, payload),
      include: { services: true },
    })) as WorkerWithServices;
    await this.syncWorkerServiceLinks(salonId, worker);
    return worker;
  }

  async update(workerId: string, salonId: string, payload: WorkerEntityInput): Promise<WorkerWithServices> {
    const worker = (await this.prisma.worker.update({
      where: { id: workerId },
      data: this.mapToUpdateData(payload),
      include: { services: true },
    })) as WorkerWithServices;
    await this.syncWorkerServiceLinks(salonId, worker);
    return worker;
  }

  async delete(workerId: string): Promise<void> {
    await this.prisma.worker.delete({ where: { id: workerId } });
  }

  private mapToCreateData(salonId: string, payload: WorkerEntityInput): Prisma.WorkerUncheckedCreateInput {
    return {
      salonId,
      crmWorkerId: payload.crmWorkerId ?? null,
      firstName: payload.firstName,
      lastName: payload.lastName,
      position: payload.position ?? null,
      role: payload.position ?? null,
      description: payload.description ?? null,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      photoUrl: payload.photoUrl ?? null,
      isActive: payload.isActive ?? true,
      createdAt: undefined as unknown as Date,
      updatedAt: undefined as unknown as Date,
    };
  }

  private mapToUpdateData(payload: WorkerEntityInput): Prisma.WorkerUpdateInput {
    return {
      crmWorkerId: payload.crmWorkerId === undefined ? undefined : payload.crmWorkerId ?? null,
      firstName: payload.firstName,
      lastName: payload.lastName,
      position: payload.position === undefined ? undefined : payload.position ?? null,
      role: payload.position === undefined ? undefined : payload.position ?? null,
      description: payload.description === undefined ? undefined : payload.description ?? null,
      email: payload.email === undefined ? undefined : payload.email ?? null,
      phone: payload.phone === undefined ? undefined : payload.phone ?? null,
      photoUrl: payload.photoUrl === undefined ? undefined : payload.photoUrl ?? null,
      isActive: payload.isActive === undefined ? undefined : payload.isActive,
    };
  }

  private async syncWorkerServiceLinks(salonId: string, worker: Worker): Promise<void> {
    const orClauses: Array<Prisma.WorkerServiceWhereInput> = [{ workerId: worker.id }];
    if (worker.crmWorkerId) {
      orClauses.push({ remoteWorkerId: worker.crmWorkerId });
    }

    await this.prisma.workerService.updateMany({
      where: {
        service: { salonId },
        OR: orClauses,
      },
      data: {
        workerId: worker.id,
        remoteWorkerId: worker.crmWorkerId ?? null,
      },
    });
  }
}
