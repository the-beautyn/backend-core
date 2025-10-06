import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ServicesService } from '../../../src/services/services.service';
import { PrismaService } from '../../../src/shared/database/prisma.service';
import { CrmIntegrationService } from '../../../src/crm-integration/core/crm-integration.service';
import { ServicesRepository } from '../../../src/services/repositories/services.repo';

describe('ServicesService', () => {
  let service: ServicesService;
  let prisma: jest.Mocked<PrismaService>;
  let integration: jest.Mocked<CrmIntegrationService>;
  let repo: jest.Mocked<ServicesRepository>;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      salon: { findFirst: jest.fn() },
      category: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    } as unknown as jest.Mocked<PrismaService>;

    integration = {
      pullServices: jest.fn(),
      rebaseServicesNow: jest.fn(),
      enqueueServicesSync: jest.fn(),
      createService: jest.fn(),
      updateService: jest.fn(),
      deleteService: jest.fn(),
    } as unknown as jest.Mocked<CrmIntegrationService>;

    repo = {
      paginate: jest.fn(),
      findByIdWithinSalon: jest.fn(),
      findById: jest.fn(),
      findBySalon: jest.fn(),
      findByCrmExternalId: jest.fn(),
      findByNameInsensitive: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    } as unknown as jest.Mocked<ServicesRepository>;

    service = new ServicesService(prisma, integration, repo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listPublic', () => {
    it('returns paginated services mapped to DTO', async () => {
      repo.paginate.mockResolvedValue({ items: [
        { id: 's1', salonId: 'salon-1', categoryId: null, crmServiceId: 'ext-1', name: 'Cut', description: null, duration: 3600, price: 1000, currency: 'UAH', sortOrder: null, workerIds: [], isActive: true, createdAt: new Date(), updatedAt: new Date() },
      ] as any, total: 1 });

      const res = await service.listPublic({ salonId: 'salon-1', page: 1, limit: 10 } as any);
      expect(repo.paginate).toHaveBeenCalledWith('salon-1', 0, 10);
      expect(res.items[0]).toMatchObject({ id: 's1', name: 'Cut', duration: 3600, price: 1000, currency: 'UAH' });
      expect(res.total).toBe(1);
    });
  });

  describe('pull/rebase', () => {
    it('pullFromCrm delegates to integration with resolved salon/provider', async () => {
      (prisma.salon.findFirst as any).mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      integration.pullServices.mockResolvedValue({ items: [], fetched: 0 } as any);

      const res = await service.pullFromCrm('user-1');
      expect(integration.pullServices).toHaveBeenCalledWith('salon-1', 'ALTEGIO');
      expect(res.items).toEqual([]);
    });

    it('rebaseFromCrm delegates to integration', async () => {
      (prisma.salon.findFirst as any).mockResolvedValue({ id: 'salon-1', provider: 'EASYWEEK' });
      integration.rebaseServicesNow.mockResolvedValue({ services: [], upserted: 0, deleted: 0 } as any);

      const res = await service.rebaseFromCrm('user-1');
      expect(integration.rebaseServicesNow).toHaveBeenCalledWith('salon-1', 'EASYWEEK');
      expect(res).toEqual({ services: [], upserted: 0, deleted: 0 });
    });

    it('rebaseFromCrmAsync enqueues sync', async () => {
      (prisma.salon.findFirst as any).mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      integration.enqueueServicesSync.mockResolvedValue({ jobId: 'job-1' });

      const res = await service.rebaseFromCrmAsync('user-1');
      expect(integration.enqueueServicesSync).toHaveBeenCalledWith('salon-1', 'ALTEGIO');
      expect(res.jobId).toBe('job-1');
    });
  });

  describe('create', () => {
    it('throws BadRequest when title is empty', async () => {
      (prisma.salon.findFirst as any).mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      await service
        .create('user-1', { title: '  ' } as any)
        .then(() => fail('Expected BadRequestException'))
        .catch((e) => expect(e).toBeInstanceOf(BadRequestException));
    });

    it('throws Conflict when category is linked but missing crm external id', async () => {
      (prisma.salon.findFirst as any).mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      (prisma.category.findFirst as any).mockResolvedValue({ id: 'cat-1', crmCategoryId: null });

      await service
        .create('user-1', { title: 'Cut', category_id: 'cat-1' } as any)
        .then(() => fail('Expected ConflictException'))
        .catch((e) => expect(e).toBeInstanceOf(ConflictException));
    });

    it('creates service via integration and upserts locally', async () => {
      (prisma.salon.findFirst as any).mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      (prisma.category.findFirst as any).mockResolvedValue({ id: 'cat-1', crmCategoryId: 'ext-cat' });
      integration.createService.mockResolvedValue({ externalId: 'ext-svc', name: 'Cut', duration: 3600, price: 1000, currency: 'UAH', categoryExternalId: 'ext-cat', isActive: true } as any);
      // upsertServiceFromCrm path — simulate prisma create
      (prisma as any).service = {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'svc-1', salonId: 'salon-1', crmServiceId: 'ext-svc', categoryId: 'cat-1', name: 'Cut', description: null, duration: 3600, price: 1000, currency: 'UAH', sortOrder: null, workerIds: [], isActive: true, createdAt: new Date(), updatedAt: new Date() }),
        update: jest.fn(),
        findUnique: jest.fn(),
      };
      (prisma.category.findUnique as any).mockResolvedValue({ serviceIds: [] });
      (prisma.category.update as any).mockResolvedValue({});

      const res = await service.create('user-1', { title: 'Cut', category_id: 'cat-1', duration: 3600, price: 1000 } as any);
      expect(integration.createService).toHaveBeenCalledWith('salon-1', 'ALTEGIO', expect.objectContaining({ name: 'Cut', categoryExternalId: 'ext-cat' }));
      expect((prisma as any).service.create).toHaveBeenCalled();
      expect(res).toMatchObject({ title: 'Cut', crmServiceId: 'ext-svc', duration: 3600, price: 1000 });
      // category link updated
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { serviceIds: { set: ['svc-1'] } },
      });
    });
  });

  describe('update', () => {
    it('returns existing service when dto is empty', async () => {
      (prisma.service as any) = { findUnique: jest.fn().mockResolvedValue({ id: 'svc-1', name: 'Cut', duration: 3600, price: 1000, currency: 'UAH' }) };
      const res = await service.update('user-1', 'svc-1', {} as any);
      expect(res.id).toBe('svc-1');
      expect(res.title).toBe('Cut');
    });

    it('throws NotFound when service absent in salon', async () => {
      (prisma.salon.findFirst as any).mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      repo.findByIdWithinSalon.mockResolvedValue(null);
      await service
        .update('user-1', 'svc-1', { title: 'New' } as any)
        .then(() => fail('Expected NotFoundException'))
        .catch((e) => expect(e).toBeInstanceOf(NotFoundException));
    });

    it('throws Conflict when service is not linked to CRM', async () => {
      (prisma.salon.findFirst as any).mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      repo.findByIdWithinSalon.mockResolvedValue({ id: 'svc-1', name: 'Cut', crmServiceId: null } as any);
      await service
        .update('user-1', 'svc-1', { title: 'New' } as any)
        .then(() => fail('Expected ConflictException'))
        .catch((e) => expect(e).toBeInstanceOf(ConflictException));
    });

    it('moves serviceId from old category to new one', async () => {
      (prisma.salon.findFirst as any).mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      repo.findByIdWithinSalon.mockResolvedValue({ id: 'svc-1', name: 'Cut', crmServiceId: 'ext-1', categoryId: 'old-cat', duration: 3600, price: 1000, currency: 'UAH', isActive: true, sortOrder: null, workerIds: [] } as any);
      (prisma.category.findFirst as any).mockResolvedValue({ id: 'new-cat', crmCategoryId: 'ext-cat' });
      integration.updateService.mockResolvedValue({ externalId: 'ext-1', name: 'Cut', categoryExternalId: 'ext-cat' } as any);
      (prisma as any).category.findUnique = jest.fn()
        .mockResolvedValueOnce({ serviceIds: ['svc-1'] })
        .mockResolvedValueOnce({ serviceIds: [] });
      (prisma as any).category.update = jest.fn().mockResolvedValue({});
      (prisma as any).service = {
        findFirst: jest.fn().mockResolvedValue({ id: 'svc-1' }),
        update: jest.fn().mockResolvedValue({ id: 'svc-1', categoryId: 'new-cat' }),
        create: jest.fn(),
      };

      await service.update('user-1', 'svc-1', { category_id: 'new-cat' } as any);
      // Removed from old category
      expect((prisma as any).category.update).toHaveBeenCalledWith({
        where: { id: 'old-cat' },
        data: { serviceIds: { set: [] } },
      });
      // Added to new category
      expect((prisma as any).category.update).toHaveBeenCalledWith({
        where: { id: 'new-cat' },
        data: { serviceIds: { set: ['svc-1'] } },
      });
    });
  });

  describe('delete', () => {
    it('throws NotFound when service missing', async () => {
      (prisma.salon.findFirst as any).mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      (prisma as any).service = { findFirst: jest.fn().mockResolvedValue(null) };
      await service
        .delete('user-1', 'svc-1')
        .then(() => fail('Expected NotFoundException'))
        .catch((e) => expect(e).toBeInstanceOf(NotFoundException));
    });

    it('throws Conflict when service is not linked to CRM', async () => {
      (prisma.salon.findFirst as any).mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      (prisma as any).service = { findFirst: jest.fn().mockResolvedValue({ id: 'svc-1', crmServiceId: null, categoryId: null }) };
      await service
        .delete('user-1', 'svc-1')
        .then(() => fail('Expected ConflictException'))
        .catch((e) => expect(e).toBeInstanceOf(ConflictException));
    });

    it('removes serviceId from category on delete', async () => {
      (prisma.salon.findFirst as any).mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      (prisma as any).service = { findFirst: jest.fn().mockResolvedValue({ id: 'svc-1', crmServiceId: 'ext-1', categoryId: 'cat-1' }) };
      integration.deleteService.mockResolvedValue(undefined as any);
      (prisma as any).category.findUnique = jest.fn().mockResolvedValue({ serviceIds: ['svc-1'] });
      (prisma as any).category.update = jest.fn().mockResolvedValue({});
      repo.delete = jest.fn().mockResolvedValue(undefined as any);

      await service.delete('user-1', 'svc-1');

      expect((prisma as any).category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { serviceIds: { set: [] } },
      });
      expect(repo.delete).toHaveBeenCalledWith('svc-1');
    });
  });
});


