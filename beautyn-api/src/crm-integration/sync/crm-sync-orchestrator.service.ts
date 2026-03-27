import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CrmIntegrationService } from '../core/crm-integration.service';
import { SalonService } from '../../salon/salon.service';
import { CategoriesService } from '../../categories/categories.service';
import { ServicesService } from '../../services/services.service';
import { WorkersService } from '../../workers/workers.service';
import { CrmType } from '@crm/shared';
import type { SalonData } from '@crm/provider-core';

@Injectable()
export class CrmSyncOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crmIntegration: CrmIntegrationService,
    private readonly salonService: SalonService,
    private readonly categoriesService: CategoriesService,
    private readonly servicesService: ServicesService,
    private readonly workersService: WorkersService,
  ) {}

  async syncSalonNow(salonId: string, provider?: CrmType): Promise<SalonData> {
    const resolvedProvider = provider ?? (await this.crmIntegration.resolveSalonProvider(salonId));
    const salon = await this.crmIntegration.pullSalon(salonId, resolvedProvider);
    await this.salonService.upsertFromCrm({ salon_id: salonId, salon });
    return salon;
  }

  async runInitialPullNow(
    salonId: string,
  ): Promise<{
    salon: SalonData;
    categories: { items: any[]; upserted: number; deleted: number };
    services: { items: any[]; upserted: number; deleted: number };
    workers: { items: any[]; upserted: number; deleted: number };
  }> {
    const provider = await this.crmIntegration.resolveSalonProvider(salonId);

    const salonSnapshot = await this.syncSalonNow(salonId, provider);
    const categoriesResult = await this.categoriesService.rebaseFromCrm(salonId);
    const servicesResult = await this.servicesService.rebaseFromCrm(salonId);
    const workersResult = await this.workersService.rebaseFromCrm(salonId);

    const [categoriesSnapshot, servicesSnapshot, workersSnapshot] = await Promise.all([
      this.loadFinalCategoriesSnapshot(salonId),
      this.loadFinalServicesSnapshot(salonId),
      this.loadFinalWorkersSnapshot(salonId),
    ]);

    return {
      salon: salonSnapshot,
      categories: {
        items: categoriesSnapshot,
        upserted: categoriesResult.upserted ?? 0,
        deleted: categoriesResult.deleted ?? 0,
      },
      services: {
        items: servicesSnapshot,
        upserted: servicesResult.upserted ?? 0,
        deleted: servicesResult.deleted ?? 0,
      },
      workers: {
        items: workersSnapshot,
        upserted: workersResult.upserted ?? 0,
        deleted: workersResult.deleted ?? 0,
      },
    };
  }

  private async loadFinalCategoriesSnapshot(salonId: string): Promise<any[]> {
    const categories = await this.prisma.category.findMany({
      where: { salonId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return categories.map((category) => ({
      id: category.id,
      salonId: category.salonId,
      crmCategoryId: category.crmCategoryId ?? null,
      name: category.name,
      color: category.color ?? null,
      sortOrder: category.sortOrder ?? null,
      serviceIds: Array.isArray(category.serviceIds) ? category.serviceIds : [],
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));
  }

  private async loadFinalServicesSnapshot(salonId: string): Promise<any[]> {
    const services = await this.prisma.service.findMany({
      where: { salonId },
      include: { workerLinks: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return services.map((service) => {
      const workerIds =
        Array.isArray((service as any).workerLinks) && (service as any).workerLinks.length
          ? (service as any).workerLinks
              .map((link: { workerId?: string | null; remoteWorkerId?: string | null }) => link.workerId ?? link.remoteWorkerId)
              .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
          : [];

      return {
        id: service.id,
        salon_id: service.salonId,
        crm_service_id: service.crmServiceId ?? null,
        category_id: service.categoryId ?? null,
        name: service.name,
        description: service.description ?? null,
        duration: service.duration,
        price: service.price,
        currency: service.currency,
        is_active: service.isActive,
        sort_order: service.sortOrder ?? null,
        worker_ids: workerIds,
      };
    });
  }

  private async loadFinalWorkersSnapshot(salonId: string): Promise<any[]> {
    const workers = await this.prisma.worker.findMany({
      where: { salonId },
      include: { services: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return workers.map((worker) => ({
      id: worker.id,
      crmWorkerId: worker.crmWorkerId ?? null,
      salonId: worker.salonId,
      firstName: worker.firstName,
      lastName: worker.lastName,
      position: worker.position ?? worker.role ?? null,
      description: worker.description ?? null,
      email: worker.email ?? null,
      phone: worker.phone ?? null,
      photoUrl: worker.photoUrl ?? null,
      serviceIds: Array.isArray(worker.services)
        ? worker.services
            .map((link: { serviceId?: string | null }) => link?.serviceId)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
        : [],
      isActive: worker.isActive,
      createdAt: worker.createdAt,
      updatedAt: worker.updatedAt,
    }));
  }
}
