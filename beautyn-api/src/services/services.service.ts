import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service';
import { CrmIntegrationService } from '../crm-integration/core/crm-integration.service';
import { CrmType } from '@crm/shared';
import { ServicesListQuery } from './dto/services-list.query';
import { OwnerServicesListQueryDto } from './dto/owner-services-list.query';
import { ServicesListResponseDto } from './dto/services-list.response.dto';
import { ServicesSyncDto } from './dto/services-sync.dto';
import { ServicesSyncResultDto } from './dto/services-sync-result.dto';
import { ServiceDto } from './dto/service.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceResponseDto } from './dto/service-response.dto';
import { toServiceDto } from './mappers/service.mapper';
import { createChildLogger } from '@shared/logger';
import { ServiceData, Page } from '@crm/provider-core';
import { ServicesRepository, ServiceRecord, WorkerServiceLinkRecord } from './repositories/services.repo';

interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

interface SalonInfo {
  salonId: string;
  provider: CrmType;
}

@Injectable()
export class ServicesService {
  private readonly log = createChildLogger('services.service');

  constructor(
    private readonly prisma: PrismaService,
    private readonly crmIntegration: CrmIntegrationService,
    private readonly servicesRepo: ServicesRepository,
  ) {}

  async listPublic(query: ServicesListQuery): Promise<ServicesListResponseDto> {
    const { page, limit, skip } = this.normalizePagination(query.page, query.limit);
    const { items, total } = await this.servicesRepo.paginate(query.salonId, skip, limit);

    return {
      items: items.map(toServiceDto),
      page,
      limit,
      total,
    };
  }

  async pullFromDb(ownerId: string, query: OwnerServicesListQueryDto): Promise<ServicesListResponseDto> {
    const { salonId } = await this.requireOwnerSalon(ownerId);
    return this.listPublic({
      salonId: salonId,
      q: query.q,
      active: query.active,
      page: query.page,
      limit: query.limit,
    });
  }

  async pullFromCrm(ownerId: string): Promise<Page<ServiceData>> {
    const { salonId, provider } = await this.requireOwnerSalon(ownerId);
    return this.crmIntegration.pullServices(salonId, provider);
  }

  async rebaseFromCrm(ownerId: string): Promise<ServicesSyncResultDto> {
    const { salonId, provider } = await this.requireOwnerSalon(ownerId);
    return this.crmIntegration.rebaseServicesNow(salonId, provider);
  }

  async rebaseFromCrmAsync(ownerId: string): Promise<{ jobId: string }> {
    const { salonId, provider } = await this.requireOwnerSalon(ownerId);
    return this.crmIntegration.enqueueServicesSync(salonId, provider);
  }

  async create(ownerId: string, dto: CreateServiceDto): Promise<ServiceResponseDto> {
    const { salonId, provider } = await this.requireOwnerSalon(ownerId);

    const name = dto.title.trim();
    if (!name) {
      throw new BadRequestException('title must not be empty');
    }

    const categoryRef = await this.ensureCategoryForSalon(salonId, dto.category_id);
    if (categoryRef && !categoryRef.crmCategoryId) {
      throw new ConflictException({ message: 'Category is not linked to CRM', code: 'CATEGORY_MISSING_CRM_EXTERNAL_ID' });
    }

    const currency = 'UAH';
    const payload = {
      name,
      duration: dto.duration,
      price: dto.price,
      currency: dto.currency ?? 'UAH',
      categoryExternalId: categoryRef?.crmCategoryId ?? '',
      isActive: dto.is_active ?? true,
      sortOrder: dto.sort_order ?? null,
      workerExternalIds: dto.worker_ids ?? [],
    };

    const crmService = await this.crmIntegration.createService(salonId, provider, payload);
    const saved = await this.upsertServiceFromCrm(salonId, crmService, {
      fallbackName: name,
      fallbackDescription: null,
      fallbackCategoryId: categoryRef?.id ?? null,
      fallbackDuration: dto.duration ?? 0,
      fallbackPrice: dto.price ?? 0,
      fallbackCurrency: currency,
      fallbackIsActive: dto.is_active ?? true,
      fallbackWorkerExternalIds: dto.worker_ids ?? [],
    });

    await this.syncCategoryServiceLink(saved);

    return this.toServiceResponse(saved);
  }

  async update(ownerId: string, serviceId: string, dto: UpdateServiceDto): Promise<ServiceResponseDto> {
    const { salonId, provider } = await this.requireOwnerSalon(ownerId);

    if (!dto || Object.keys(dto).length === 0) {
      const fallback = await this.servicesRepo.findByIdWithinSalon(serviceId, salonId);
      if (!fallback) throw new NotFoundException('Service not found');
      return this.toServiceResponse(fallback);
    }

    const service = await this.servicesRepo.findByIdWithinSalon(serviceId, salonId);
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const categoryRef = await this.ensureCategoryForSalon(salonId, dto.category_id);
    if (categoryRef && !categoryRef.crmCategoryId) {
      throw new ConflictException({ message: 'Category is not linked to CRM', code: 'CATEGORY_MISSING_CRM_EXTERNAL_ID' });
    }
    const categoryExternalId = categoryRef?.crmCategoryId ?? null;

    const patch: {
      name?: string;
      description?: string | null;
      duration?: number;
      price?: number;
      currency?: string;
      categoryExternalId?: string | null;
      isActive?: boolean;
      sortOrder?: number | null;
      workerExternalIds?: string[];
    } = {};

    if (dto.title !== undefined) {
      const name = dto.title.trim();
      if (!name) throw new BadRequestException('title must not be empty');
      patch.name = name;
    }
    if (dto.description !== undefined) patch.description = dto.description ?? null;
    if (dto.duration !== undefined) patch.duration = dto.duration;
    if (dto.price !== undefined) patch.price = dto.price;
    if (dto.currency !== undefined) patch.currency = dto.currency.toUpperCase();
    if (dto.is_active !== undefined) patch.isActive = dto.is_active;

    patch.categoryExternalId = categoryRef?.crmCategoryId;

    if (dto.sort_order !== undefined) {
      patch.sortOrder = dto.sort_order;
    }

    if (dto.worker_ids !== undefined) {
      patch.workerExternalIds = dto.worker_ids;
    }

    if (!service.crmServiceId) {
      throw new ConflictException({ message: 'Service is not linked to CRM', code: 'SERVICE_MISSING_CRM_EXTERNAL_ID' });
    }

    const crmResult = await this.crmIntegration.updateService(salonId, provider, service.crmServiceId, patch);
    const saved = await this.upsertServiceFromCrm(salonId, crmResult, {
      fallbackId: serviceId,
      fallbackName: patch.name ?? service.name,
      fallbackDescription: patch.description ?? service.description,
      fallbackDuration: patch.duration ?? service.duration,
      fallbackPrice: patch.price ?? service.price,
      fallbackCurrency: patch.currency ?? service.currency,
      fallbackIsActive: patch.isActive ?? service.isActive,
      fallbackCategoryId: categoryExternalId !== undefined ? (await this.resolveCategoryIdByExternalId(salonId, categoryExternalId ?? undefined)) ?? null : service.categoryId,
      fallbackSortOrder: patch.sortOrder ?? service.sortOrder ?? null,
      fallbackWorkerExternalIds: patch.workerExternalIds ?? this.getWorkerExternalIds(service),
    });

    await this.syncCategoryServiceLink(saved, service.categoryId ?? null);

    return this.toServiceResponse(saved);
  }

  async delete(ownerId: string, serviceId: string): Promise<void> {
    const { salonId, provider } = await this.requireOwnerSalon(ownerId);

    const prismaAny = this.prisma as any;
    const service = await prismaAny.service.findFirst({ where: { id: serviceId, salonId } });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    if (!service.crmServiceId) {
      throw new ConflictException({ message: 'Service is not linked to CRM', code: 'SERVICE_MISSING_CRM_EXTERNAL_ID' });
    }

    await this.crmIntegration.deleteService(salonId, provider, service.crmServiceId);
    if (service.categoryId) {
      await this.removeServiceFromCategory(service.categoryId, service.id);
    }
    await this.servicesRepo.delete(serviceId);
  }

  async syncFromCrm(payload: ServicesSyncDto): Promise<{ upserted: number; deleted: number; services: ServiceDto[] }> {
    const { salon_id } = payload;

    const existingCategories = await (this.prisma as any).category.findMany({ where: { salonId: salon_id } });
    const categoriesByCrm = new Map<string, { id: string; name: string }>();
    existingCategories.forEach((c: any) => {
      if (c.crmCategoryId) categoriesByCrm.set(c.crmCategoryId, { id: c.id, name: c.name });
    });

    const existingServices = await this.servicesRepo.findBySalon(salon_id);
    const servicesByCrm = new Map<string, any>();
    const servicesByName = new Map<string, any>();
    existingServices.forEach((s: any) => {
      if (s.crmServiceId) servicesByCrm.set(s.crmServiceId, s);
      servicesByName.set(s.name.toLowerCase(), s);
    });

    const workers = await this.prisma.worker.findMany({
      where: { salonId: salon_id },
      select: { id: true, crmWorkerId: true },
    });
    const workersByCrm = new Map<string, string>();
    for (const w of workers) {
      if (w.crmWorkerId) {
        workersByCrm.set(w.crmWorkerId, w.id);
      }
    }

    let upserted = 0;
    const keepServiceIds = new Set<string>();
    for (const svc of payload.services) {
      let existing: any;
      if (servicesByCrm.has(svc.crm_service_id)) {
        existing = servicesByCrm.get(svc.crm_service_id);
      }

      const categoryId = svc.category_external_id
        ? categoriesByCrm.get(svc.category_external_id)?.id ?? null
        : null;

      const remoteWorkerIds = this.normalizeWorkerExternalIds(svc.worker_ids);

      const data = {
        salonId: salon_id,
        crmServiceId: svc.crm_service_id,
        categoryId,
        name: svc.name,
        description: svc.description ?? null,
        duration: svc.duration ?? existing?.duration ?? undefined,
        price: svc.price ?? existing?.price ?? undefined,
        currency: (svc.currency ?? existing?.currency ?? 'UAH'),
        sortOrder: (svc.sort_order ?? existing?.sortOrder ?? null),
        isActive: (svc.is_active ?? existing?.isActive ?? undefined),
      };

      let record;
      if (existing) {
        record = await this.servicesRepo.update(existing.id, data);
      } else {
        record = await this.servicesRepo.create(data as any);
      }

      record = await this.syncServiceWorkers(salon_id, record.id, remoteWorkerIds, workersByCrm);

      upserted++;
      keepServiceIds.add(record.id);
      servicesByName.set(record.name.toLowerCase(), record);
      if (record.crmServiceId) servicesByCrm.set(record.crmServiceId, record);

      await this.syncCategoryServiceLink(record, existing?.categoryId ?? null);
    }

    const removeServiceIds = existingServices
      .filter((s: any) => !keepServiceIds.has(s.id))
      .map((s: any) => s.id);
    let deleted = 0;
    if (removeServiceIds.length) {
      const removeSet = new Set(removeServiceIds);
      for (const service of existingServices) {
        if (removeSet.has(service.id) && service.categoryId) {
          await this.removeServiceFromCategory(service.categoryId, service.id);
        }
      }
      deleted = await this.servicesRepo.deleteMany(removeServiceIds);
    }

    const finalServices = await this.servicesRepo.findBySalon(salon_id);

    return {
      upserted,
      deleted,
      services: finalServices.map(toServiceDto),
    };
  }

  private normalizePagination(page?: number, limit?: number): PaginationParams {
    const resolvedPage = page && page > 0 ? page : 1;
    let resolvedLimit = limit && limit > 0 ? limit : 50;
    resolvedLimit = Math.min(resolvedLimit, 200);
    return {
      page: resolvedPage,
      limit: resolvedLimit,
      skip: (resolvedPage - 1) * resolvedLimit,
    };
  }

  private async requireOwnerSalon(userId: string): Promise<SalonInfo> {
    const salon = await (this.prisma as any).salon.findFirst({
      where: { ownerUserId: userId, deletedAt: null },
      select: { id: true, provider: true },
    });

    if (!salon?.id) {
      throw new NotFoundException('Salon not found');
    }
    if (!salon.provider) {
      throw new ConflictException({ message: 'Salon is not linked to a CRM provider', code: 'SALON_NOT_LINKED_TO_CRM' });
    }
    return { salonId: salon.id, provider: salon.provider as CrmType };
  }

  private async ensureCategoryForSalon(
    salonId: string,
    categoryId?: string,
    opts: { allowNull?: boolean } = {},
  ): Promise<{ id: string | null; crmCategoryId: string | null } | null> {
    if (categoryId === undefined) return null;
    if (categoryId === null) {
      if (opts.allowNull) return { id: null, crmCategoryId: null };
      throw new BadRequestException('categoryId cannot be null');
    }
    
    const category = await (this.prisma as any).category.findFirst({
      where: { salonId, id: categoryId },
      select: { id: true, crmCategoryId: true },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return { id: category.id, crmCategoryId: category.crmCategoryId ?? null };
  }

  private async resolveCategoryIdByExternalId(salonId: string, externalId?: string | number | null): Promise<string | null> {
    if (externalId === undefined || externalId === null) return null;
    const category = await (this.prisma as any).category.findFirst({
      where: { salonId, crmCategoryId: String(externalId) },
      select: { id: true },
    });
    return category?.id ?? null;
  }

  private async upsertServiceFromCrm(
    salonId: string,
    data: ServiceData,
    fallback: {
      fallbackId?: string;
      fallbackName: string;
      fallbackDescription: string | null;
      fallbackDuration: number;
      fallbackPrice: number;
      fallbackCurrency: string;
      fallbackIsActive: boolean;
      fallbackCategoryId: string | null;
      fallbackSortOrder?: number | null;
      fallbackWorkerExternalIds?: string[];
    },
  ): Promise<ServiceRecord> {
    const prismaAny = this.prisma as any;
    const categoryId =
      (await this.resolveCategoryIdByExternalId(salonId, data.categoryExternalId)) ?? fallback.fallbackCategoryId ?? null;

    const durationSeconds =
      typeof (data as any).duration === 'number'
        ? (data as any).duration
        : fallback.fallbackDuration;

    const priceMinor =
      typeof (data as any).price === 'number'
        ? (data as any).price
        : fallback.fallbackPrice;

    const workerExternalIds = this.normalizeWorkerExternalIds(
      Array.isArray((data as any).workerExternalIds) ? (data as any).workerExternalIds : fallback.fallbackWorkerExternalIds,
    );

    const recordData = {
      salonId,
      crmServiceId: data.externalId ?? null,
      categoryId,
      name: data.name ?? fallback.fallbackName,
      description: data.description ?? fallback.fallbackDescription,
      duration: durationSeconds,
      price: priceMinor,
      currency: (data.currency ?? fallback.fallbackCurrency).toUpperCase(),
      sortOrder: (data as any).sortOrder ?? fallback.fallbackSortOrder ?? null,
      isActive: data.isActive ?? fallback.fallbackIsActive,
    };
    
    let existing: any = null;
    if (data.externalId) {
      existing = await prismaAny.service.findFirst({ where: { salonId, crmServiceId: data.externalId } });
    }

    let targetId: string;
    if (existing) {
      const updated = await prismaAny.service.update({ where: { id: existing.id }, data: recordData });
      targetId = updated.id;
    } else if (fallback.fallbackId) {
      try {
        const updatedFallback = await prismaAny.service.update({ where: { id: fallback.fallbackId }, data: recordData });
        targetId = updatedFallback.id;
      } catch {
        const created = await prismaAny.service.create({ data: recordData });
        targetId = created.id;
      }
    } else {
      const created = await prismaAny.service.create({ data: recordData });
      targetId = created.id;
    }

    return this.syncServiceWorkers(salonId, targetId, workerExternalIds);
  }

  private async syncCategoryServiceLink(
    service: { id: string; categoryId: string | null },
    previousCategoryId: string | null = null,
  ): Promise<void> {
    const prismaAny = this.prisma as any;
    const targetCategoryId = service.categoryId ?? null;

    if (previousCategoryId && previousCategoryId !== targetCategoryId) {
      await this.removeServiceFromCategory(previousCategoryId, service.id);
    }

    if (!targetCategoryId) {
      return;
    }

    const category = await prismaAny.category.findUnique({
      where: { id: targetCategoryId },
      select: { serviceIds: true },
    });
    if (!category) {
      return;
    }

    const currentIds: string[] = Array.isArray(category.serviceIds) ? category.serviceIds : [];
    if (currentIds.includes(service.id)) {
      return;
    }

    await prismaAny.category.update({
      where: { id: targetCategoryId },
      data: {
        serviceIds: {
          set: [...currentIds, service.id],
        },
      },
    });
  }

  private async removeServiceFromCategory(categoryId: string, serviceId: string): Promise<void> {
    const prismaAny = this.prisma as any;
    const category = await prismaAny.category.findUnique({
      where: { id: categoryId },
      select: { serviceIds: true },
    });

    if (!category || !Array.isArray(category.serviceIds) || category.serviceIds.length === 0) {
      return;
    }

    const filtered = category.serviceIds.filter((id: string) => id !== serviceId);
    if (filtered.length === category.serviceIds.length) {
      return;
    }

    await prismaAny.category.update({
      where: { id: categoryId },
      data: {
        serviceIds: {
          set: filtered,
        },
      },
    });
  }

  private normalizeWorkerExternalIds(input?: string[] | null): string[] {
    if (!Array.isArray(input) || input.length === 0) {
      return [];
    }
    const unique = new Set<string>();
    for (const value of input) {
      if (value === undefined || value === null) continue;
      const str = String(value).trim();
      if (str) {
        unique.add(str);
      }
    }
    return Array.from(unique);
  }

  private async syncServiceWorkers(
    salonId: string,
    serviceId: string,
    remoteWorkerIds: string[],
    workersByCrm?: Map<string, string>,
  ): Promise<ServiceRecord> {
    const workerServiceClient = (this.prisma as any).workerService;
    if (!workerServiceClient?.findMany) {
      const fallback = await this.servicesRepo.findById(serviceId);
      if (!fallback) {
        throw new NotFoundException('Service not found after syncing workers');
      }
      return fallback;
    }

    const workerLookup = workersByCrm ?? (await this.loadWorkersByCrmMap(salonId));
    const normalizedRemoteIds = this.normalizeWorkerExternalIds(remoteWorkerIds);

    const existingLinks = await workerServiceClient.findMany({
      where: { serviceId },
      select: { id: true, workerId: true, remoteWorkerId: true },
    });

    const linksByRemote = new Map<string, WorkerServiceLinkRecord>();
    const linksByWorker = new Map<string, WorkerServiceLinkRecord>();
    for (const link of existingLinks) {
      if (link.remoteWorkerId) {
        linksByRemote.set(link.remoteWorkerId, { ...link });
      }
      if (link.workerId) {
        linksByWorker.set(link.workerId, { ...link });
      }
    }

    const keepIds = new Set<string>();

    for (const remoteId of normalizedRemoteIds) {
      const workerId = workerLookup.get(remoteId) ?? null;
      let link: WorkerServiceLinkRecord | null =
        linksByRemote.get(remoteId) ??
        (workerId ? linksByWorker.get(workerId) ?? null : null);

      if (!link) {
        const created = await workerServiceClient.create({
          data: {
            serviceId,
            workerId,
            remoteWorkerId: remoteId,
          },
          select: { id: true, workerId: true, remoteWorkerId: true },
        });
        keepIds.add(created.id);
        if (created.remoteWorkerId) {
          linksByRemote.set(created.remoteWorkerId, { ...created });
        }
        if (created.workerId) {
          linksByWorker.set(created.workerId, { ...created });
        }
        if (workerId) {
          workerLookup.set(remoteId, workerId);
        }
        continue;
      }

      const currentLink: WorkerServiceLinkRecord = link;

      const updates: { workerId?: string | null; remoteWorkerId?: string | null } = {};
      if ((currentLink.workerId ?? null) !== (workerId ?? null)) {
        updates.workerId = workerId;
      }
      if ((currentLink.remoteWorkerId ?? null) !== remoteId) {
        updates.remoteWorkerId = remoteId;
      }
      if (Object.keys(updates).length > 0) {
        const updated = await workerServiceClient.update({
          where: { id: currentLink.id },
          data: updates,
          select: { id: true, workerId: true, remoteWorkerId: true },
        });
        if (updated.remoteWorkerId) {
          linksByRemote.set(updated.remoteWorkerId, { ...updated });
        }
        if (updated.workerId) {
          linksByWorker.set(updated.workerId, { ...updated });
        }
        keepIds.add(updated.id);
      } else {
        keepIds.add(currentLink.id);
      }
      if (workerId) {
        workerLookup.set(remoteId, workerId);
      }
    }

    const removeIds = existingLinks
      .filter((link) => !keepIds.has(link.id))
      .map((link) => link.id);
    if (removeIds.length) {
      await workerServiceClient.deleteMany({ where: { id: { in: removeIds } } });
    }

    const refreshed = await this.servicesRepo.findById(serviceId);
    if (!refreshed) {
      throw new NotFoundException('Service not found after syncing workers');
    }
    return refreshed;
  }

  private async loadWorkersByCrmMap(salonId: string): Promise<Map<string, string>> {
    const workerClient = (this.prisma as any).worker;
    if (!workerClient?.findMany) {
      return new Map<string, string>();
    }
    const rows = await workerClient.findMany({
      where: { salonId },
      select: { id: true, crmWorkerId: true },
    });
    const map = new Map<string, string>();
    for (const row of rows) {
      if (row.crmWorkerId) {
        map.set(row.crmWorkerId, row.id);
      }
    }
    return map;
  }

  private getWorkerExternalIds(service: ServiceRecord): string[] {
    if (!service?.workerLinks?.length) {
      return [];
    }
    const unique = new Set<string>();
    for (const link of service.workerLinks) {
      const value = link.remoteWorkerId ?? link.workerId;
      if (value) {
        unique.add(value);
      }
    }
    return Array.from(unique);
  }

  private toServiceResponse(record: ServiceRecord): ServiceResponseDto {
    return {
      id: record.id,
      salonId: record.salonId,
      categoryId: record.categoryId ?? null,
      crmServiceId: record.crmServiceId ?? null,
      title: record.name,
      description: record.description ?? null,
      duration: record.duration,
      price: record.price,
      currency: record.currency,
      sortOrder: record.sortOrder ?? null,
      workerIds: record.workerIds ?? [],
      isActive: record.isActive,
      createdAt: this.toDate(record.createdAt),
      updatedAt: this.toDate(record.updatedAt),
    };
  }

  private toDate(value: string | Date): Date {
    if (value instanceof Date) {
      return value;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return new Date();
    }
    return date;
  }
}
