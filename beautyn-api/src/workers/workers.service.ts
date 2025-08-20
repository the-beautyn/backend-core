import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Worker as WorkerModel, WorkerService as WorkerServiceModel } from '@prisma/client';
import { PrismaService } from '../shared/database/prisma.service';
import { WorkerDto } from './dto/worker.dto';
import { WorkersListQuery } from './dto/workers-list.query';
import { WorkerAvailabilityQuery } from './dto/worker-availability.query';
import { WorkersSyncDto } from './dto/workers-sync.dto';
import { WorkerMapper } from './mappers/worker.mapper';

@Injectable()
export class WorkersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: WorkersListQuery): Promise<{ items: WorkerDto[]; page: number; limit: number; total: number }> {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;
    const where: Prisma.WorkerWhereInput = {
      salonId: query.salon_id,
    };
    if (query.active !== undefined) {
      const active = typeof query.active === 'string' ? query.active === 'true' : query.active;
      where.isActive = active;
    }
    if (query.q) {
      where.OR = [
        { firstName: { contains: query.q, mode: 'insensitive' } },
        { lastName: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.worker.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.worker.count({ where }),
    ]);
    return {
      items: items.map((w) => WorkerMapper.toDto(w)),
      page,
      limit,
      total,
    };
  }

  async getById(id: string, includeServices = false): Promise<WorkerDto | null> {
    const worker = await this.prisma.worker.findUnique({
      where: { id },
      include: includeServices ? { services: true } : undefined,
    });
    if (!worker) return null;
    return WorkerMapper.toDto(worker as WorkerModel & { services?: WorkerServiceModel[] });
  }

  async availability(workerId: string, query: WorkerAvailabilityQuery): Promise<{ slots: Array<{ from: string; to: string }> }> {
    const worker = await this.prisma.worker.findUnique({
      where: { id: workerId },
      select: { workSchedule: true },
    });
    if (!worker) {
      throw new NotFoundException('Worker not found');
    }
    let slots: Array<{ from: string; to: string }> = [];
    const date = new Date(query.date);
    const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const weekday = weekdays[date.getUTCDay()];
    const schedule = worker?.workSchedule as
      | Record<string, Array<{ from: string; to: string }>>
      | null;
    if (schedule && schedule[weekday]) {
      slots = schedule[weekday];
    } else {
      slots = this.defaultSlots();
    }
    return { slots };
  }

  private defaultSlots() {
    const slots: Array<{ from: string; to: string }> = [];
    let start = 9 * 60;
    const end = 18 * 60;
    while (start < end) {
      const fromHour = Math.floor(start / 60);
      const fromMin = start % 60;
      const to = start + 30;
      const toHour = Math.floor(to / 60);
      const toMin = to % 60;
      slots.push({
        from: `${fromHour.toString().padStart(2, '0')}:${fromMin
          .toString()
          .padStart(2, '0')}`,
        to: `${toHour.toString().padStart(2, '0')}:${toMin.toString().padStart(2, '0')}`,
      });
      start = to;
    }
    return slots;
  }

  async syncFromCrm(payload: WorkersSyncDto): Promise<{ upserted: number; unlinked: number }> {
    let upserted = 0;
    let unlinked = 0;
    for (const w of payload.workers) {
      const where: Prisma.WorkerWhereInput = w.email
        ? { salonId: payload.salon_id, email: w.email }
        : {
            salonId: payload.salon_id,
            firstName: w.first_name,
            lastName: w.last_name,
          };
      let worker = await this.prisma.worker.findFirst({ where });
      if (worker) {
        worker = await this.prisma.worker.update({
          where: { id: worker.id },
          data: {
            firstName: w.first_name,
            lastName: w.last_name,
            role: w.role ?? null,
            email: w.email ?? null,
            phone: w.phone ?? null,
            photoUrl: w.photo_url ?? null,
            isActive: w.is_active ?? true,
            workSchedule: this.normalizeWorkSchedule(w.work_schedule),
          },
        });
      } else {
        worker = await this.prisma.worker.create({
          data: {
            salonId: payload.salon_id,
            firstName: w.first_name,
            lastName: w.last_name,
            role: w.role ?? null,
            email: w.email ?? null,
            phone: w.phone ?? null,
            photoUrl: w.photo_url ?? null,
            isActive: w.is_active ?? true,
            workSchedule: this.normalizeWorkSchedule(w.work_schedule),
          },
        });
      }
      upserted++;
      const del = await this.prisma.workerService.deleteMany({ where: { workerId: worker.id } });
      unlinked += del.count;
      if (w.service_external_ids && w.service_external_ids.length > 0) {
        const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(
          Prisma.sql`SELECT id FROM services WHERE salon_id = ${payload.salon_id} AND crm_external_id IN (${Prisma.join(
            w.service_external_ids,
          )})`,
        );
        if (rows.length) {
          await this.prisma.workerService.createMany({
            data: rows.map((r) => ({ workerId: worker.id, serviceId: r.id })),
            skipDuplicates: true,
          });
        }
      }
    }
    return { upserted, unlinked };
  }
}

// Runtime validation/normalization helpers
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTimeString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = value.match(/^([0-1]\d|2[0-3]):([0-5]\d)$/);
  return !!m;
}

function isSlotArray(value: unknown): value is Array<{ from: string; to: string }> {
  if (!Array.isArray(value)) return false;
  for (const item of value) {
    if (!isRecord(item) || !isTimeString(item.from) || !isTimeString(item.to)) return false;
  }
  return true;
}

declare module './workers.service' {
  interface WorkersService {
    normalizeWorkSchedule(input: unknown): Prisma.InputJsonValue | undefined;
  }
}

WorkersService.prototype.normalizeWorkSchedule = function (
  input: unknown,
): Prisma.InputJsonValue | undefined {
  if (!input) return undefined;
  if (!isRecord(input)) return undefined;
  const out: Record<string, Array<{ from: string; to: string }>> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!isSlotArray(value)) continue;
    out[key] = value.map((v) => ({ from: v.from, to: v.to }));
  }
  return Object.keys(out).length > 0 ? (out as unknown as Prisma.InputJsonValue) : undefined;
};
