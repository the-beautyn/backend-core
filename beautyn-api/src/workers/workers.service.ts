import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service';
import { WorkerDto } from './dto/worker.dto';
import { PublicWorkerDto } from './dto/worker-public.dto';
import { WorkersListQuery } from './dto/workers-list.query';
import { WorkersSyncDto } from './dto/workers-sync.dto';
import { UpsertWorkerDto } from './dto/upsert-worker.dto';
import { WorkersCategory } from './category/workers.category';
import { WorkersRepository, WorkerEntityInput } from './repositories/workers.repository';
import { WorkerMapper } from './mappers/worker.mapper';
import { CrmIntegrationService } from '../crm-integration/core/crm-integration.service';
import { CapabilityRegistryService, Capability } from '@crm/capability-registry';
import { CrmType, uuidV5FromStrings } from '@crm/shared';
import { WorkerData } from '@crm/provider-core';
import { createChildLogger } from '@shared/logger';
import { Page } from '@crm/provider-core';

interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

@Injectable()
export class WorkersService {
  private readonly log = createChildLogger('workers.service');

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: WorkersRepository,
    private readonly category: WorkersCategory,
    private readonly crmIntegration: CrmIntegrationService,
    private readonly caps: CapabilityRegistryService,
  ) {}

  // -------- Public API -------- //

  async listPublic(query: WorkersListQuery): Promise<{ items: PublicWorkerDto[]; page: number; limit: number; total: number }> {
    const salonId = query.salonId ?? (query as Record<string, any>)?.salon_id;
    if (!salonId) {
      throw new BadRequestException('salonId is required');
    }
    const { page, limit, skip } = this.normalizePagination(query.page, query.limit);
    const { items, total } = await this.repository.paginate(salonId, {
      skip,
      take: limit,
      search: query.q ?? null,
      isActive: this.normalizeBoolean(query.active),
    });
    return {
      items: items.map((row) => WorkerMapper.toPublicDto(row)),
      page,
      limit,
      total,
    };
  }

  async getPublicById(workerId: string): Promise<PublicWorkerDto | null> {
    if (!this.isUuid(workerId)) {
      return null;
    }
    const worker = await this.prisma.worker.findUnique({
      where: { id: workerId },
    });
    if (!worker) return null;
    return WorkerMapper.toPublicDto(worker);
  }

  async getById(workerId: string, includeServices = false): Promise<WorkerDto | null> {
    if (!this.isUuid(workerId)) {
      return null;
    }
    const worker = await this.prisma.worker.findUnique({
      where: { id: workerId },
      include: includeServices ? { services: true } : undefined,
    });
    if (!worker) return null;
    return WorkerMapper.toDto(worker);
  }

  // -------- Authenticated API -------- //

  async pullFromCrm(salonId: string): Promise<WorkerDto[]> {
    const provider = await this.requireSalonProvider(salonId);
    let page = await this.crmIntegration.pullWorkers(salonId, provider);
    return page.items.map((item) => this.mapCrmWorkerToPreviewDto(item, salonId));
  }

  async pull(salonId: string, opts?: { page?: number; limit?: number; search?: string; isActive?: boolean }): Promise<{ items: WorkerDto[]; page: number; limit: number; total: number }> {
    const { page, limit, skip } = this.normalizePagination(opts?.page, opts?.limit);
    const { items, total } = await this.repository.paginate(salonId, {
      skip,
      take: limit,
      search: opts?.search ?? null,
      isActive: typeof opts?.isActive === 'boolean' ? opts.isActive : null,
    });
    return {
      items: items.map((row) => WorkerMapper.toDto(row)),
      page,
      limit,
      total,
    };
  }

  async rebaseFromCrm(salonId: string): Promise<{ workers: WorkerDto[]; upserted: number; deleted: number }> {
    const provider = await this.requireSalonProvider(salonId);
    const page = await this.crmIntegration.pullWorkers(salonId, provider);
    const payload = (page?.items ?? []).map((worker) => {
      const { firstName, lastName } = this.splitName(worker);
      return {
        crmWorkerId: worker.externalId ?? null,
        firstName,
        lastName,
        position: worker.position ?? null,
        description: worker.description ?? null,
        email: worker.email ?? null,
        phone: worker.phone ?? null,
        photoUrl: worker.photoUrl ?? null,
        isActive: worker.isActive ?? true,
      };
    });
    return this.syncFromCrm({ salonId, workers: payload });
  }

  async rebaseFromCrmAsync(salonId: string): Promise<{ jobId: string }> {
    const provider = await this.requireSalonProvider(salonId);
    return this.crmIntegration.enqueueWorkersSync(salonId, provider);
  }

  async create(salonId: string, dto: UpsertWorkerDto): Promise<WorkerDto> {
    const provider = await this.requireSalonProvider(salonId);
    const payload = this.mapUpsertDtoToEntity(dto);
    const crmWorker = await this.crmIntegration.createWorker(salonId, provider, payload);
    const saved = await this.category.create(salonId, this.mapCrmWorkerToEntity(crmWorker));
    return saved;
  }

  async update(salonId: string, workerId: string, dto: UpsertWorkerDto): Promise<WorkerDto> {
    const provider = await this.requireSalonProvider(salonId);
    const current = await this.category.requireWithinSalon(workerId, salonId);
    if (!current.crmWorkerId) {
      throw new ConflictException({ message: 'Worker is not linked to CRM', code: 'WORKER_MISSING_CRM_ID' });
    }
    const payload = this.mapUpsertDtoToEntity(dto);
    const crmWorker = await this.crmIntegration.updateWorker(salonId, provider, current.crmWorkerId, payload);
    const updated = await this.category.update(workerId, salonId, this.mapCrmWorkerToEntity(crmWorker));
    return updated;
  }

  async delete(salonId: string, workerId: string): Promise<{ id: string }> {
    const provider = await this.requireSalonProvider(salonId);
    const current = await this.category.requireWithinSalon(workerId, salonId);
    if (!current.crmWorkerId) {
      throw new ConflictException({ message: 'Worker is not linked to CRM', code: 'WORKER_MISSING_CRM_ID' });
    }
    await this.crmIntegration.deleteWorker(salonId, provider, current.crmWorkerId);
    await this.category.delete(workerId);
    return { id: workerId };
  }

  // -------- Internal Sync (queue/webhook) -------- //

  async syncFromCrm(dto: WorkersSyncDto): Promise<{ workers: WorkerDto[]; upserted: number; deleted: number }> {
    if (!dto?.salonId) {
      throw new BadRequestException('salonId is required');
    }
    const mapped = (dto.workers ?? []).map((w) => this.mapCrmSyncPayload(w));
    return this.category.rebase(dto.salonId, mapped);
  }

  // -------- Private helpers -------- //

  private normalizePagination(page?: number | string, limit?: number | string): PaginationParams {
    const p = Number(page ?? 1);
    const l = Number(limit ?? 20);
    const safePage = Number.isFinite(p) && p > 0 ? Math.floor(p) : 1;
    const safeLimit = Number.isFinite(l) && l > 0 ? Math.min(Math.floor(l), 100) : 20;
    const skip = (safePage - 1) * safeLimit;
    return { page: safePage, limit: safeLimit, skip };
  }

  private normalizeBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }
    return null;
  }

  private async requireSalonProvider(salonId: string): Promise<CrmType> {
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
      select: { provider: true },
    });
    if (!salon?.provider) {
      throw new NotFoundException('Salon not found for owner');
    }
    return salon.provider as CrmType;
  }

  private ensureCapability(provider: CrmType, capability: keyof Capability): void {
    this.caps.assert(provider, capability);
  }

  private mapCrmWorkerToEntity(worker: WorkerData): WorkerEntityInput {
    const { firstName, lastName } = this.splitName(worker);

    return {
      crmWorkerId: worker.externalId ?? null,
      firstName,
      lastName,
      position: worker.position ?? null,
      description: worker.description ?? null,
      email: worker.email ?? null,
      phone: worker.phone ?? null,
      photoUrl: worker.photoUrl ?? null,
      isActive: worker.isActive ?? true,
    };
  }

  private mapCrmWorkerToPreviewDto(worker: WorkerData, salonId: string): WorkerDto {
    const entity = this.mapCrmWorkerToEntity(worker);
    return {
      id: entity.crmWorkerId ?? uuidV5FromStrings('workers-preview', salonId, worker.externalId ?? entity.firstName + ' ' + entity.lastName),
      crmWorkerId: entity.crmWorkerId ?? null,
      salonId,
      firstName: entity.firstName,
      lastName: entity.lastName,
      position: entity.position ?? null,
      description: entity.description ?? null,
      email: entity.email ?? null,
      phone: entity.phone ?? null,
      photoUrl: entity.photoUrl ?? null,
      isActive: entity.isActive ?? true,
      createdAt: worker.updatedAtIso ? new Date(worker.updatedAtIso) : new Date(),
      updatedAt: worker.updatedAtIso ? new Date(worker.updatedAtIso) : new Date(),
    };
  }

  private mapCrmSyncPayload(worker: WorkersSyncDto['workers'][number]): WorkerEntityInput {
    return {
      crmWorkerId: worker.crmWorkerId ?? null,
      firstName: worker.firstName,
      lastName: worker.lastName,
      position: worker.position ?? null,
      description: worker.description ?? null,
      email: worker.email ?? null,
      phone: worker.phone ?? null,
      photoUrl: worker.photoUrl ?? null,
      isActive: worker.isActive ?? true,
    };
  }

  private mapUpsertDtoToEntity(dto: UpsertWorkerDto): WorkerEntityInput {
    return {
      firstName: dto.first_name.trim(),
      lastName: dto.last_name.trim(),
      position: dto.position?.trim() ?? null,
      description: dto.description?.trim() ?? null,
      email: dto.email?.trim() ?? null,
      phone: dto.phone?.trim() ?? null,
      photoUrl: dto.photo_url?.trim() ?? null,
      isActive: dto.is_active ?? true,
    };
  }

  private splitName(worker: WorkerData): { firstName: string; lastName: string } {
    const rawFirst = (worker as any).firstName as string | undefined;
    const rawLast = (worker as any).lastName as string | undefined;
    if (rawFirst || rawLast) {
      return {
        firstName: (rawFirst ?? '').trim() || 'Unknown',
        lastName: (rawLast ?? '').trim() || 'Worker',
      };
    }
    const name = worker.name ?? '';
    const parts = name.split(' ').filter((p) => p.trim().length > 0);
    if (parts.length === 0) {
      return { firstName: 'Unknown', lastName: 'Worker' };
    }
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: 'Worker' };
    }
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
