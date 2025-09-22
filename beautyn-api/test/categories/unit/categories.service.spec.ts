import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from '../../../src/categories/categories.service';
import { CategoriesRepository } from '../../../src/categories/repositories/categories.repo';
import { CapabilityRegistryService } from '@crm/capability-registry';
import { CrmAdapterService } from '@crm/adapter';
import { SyncSchedulerService } from '@crm/sync-scheduler';
import { PrismaService } from '../../../src/shared/database/prisma.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repo: jest.Mocked<CategoriesRepository>;
  let prisma: jest.Mocked<PrismaService>;
  let caps: jest.Mocked<CapabilityRegistryService>;
  let crm: jest.Mocked<CrmAdapterService>;
  let scheduler: jest.Mocked<SyncSchedulerService>;

  beforeEach(() => {
    repo = {
      paginate: jest.fn(),
      findById: jest.fn(),
      findByIdWithinSalon: jest.fn(),
      findByNameInsensitive: jest.fn(),
      upsertFromCrm: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      hasServices: jest.fn(),
    } as unknown as jest.Mocked<CategoriesRepository>;

    prisma = {
      salon: { findFirst: jest.fn() },
      category: { findMany: jest.fn(), deleteMany: jest.fn() },
    } as unknown as jest.Mocked<PrismaService>;

    caps = {
      has: jest.fn().mockReturnValue(true),
      get: jest.fn(),
      assert: jest.fn(),
      list: jest.fn(),
    } as unknown as jest.Mocked<CapabilityRegistryService>;

    crm = {
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      pullCategories: jest.fn(),
      pullSalon: jest.fn(),
      pullBookings: jest.fn(),
    } as unknown as jest.Mocked<CrmAdapterService>;

    scheduler = {
      scheduleSync: jest.fn(),
    } as unknown as jest.Mocked<SyncSchedulerService>;

    service = new CategoriesService(repo, prisma, caps, crm, scheduler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates category via CRM when supported', async () => {
      prisma.salon.findFirst.mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      repo.findByNameInsensitive.mockResolvedValue(null);
      crm.createCategory.mockResolvedValue({ externalId: '123', name: 'Hair', sortOrder: 10, color: '#FFAA00' } as any);
      repo.upsertFromCrm.mockResolvedValue({
        id: 'cat-1',
        salonId: 'salon-1',
        crmExternalId: '123',
        name: 'Hair',
        color: '#FFAA00',
        sortOrder: 10,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      } as any);

      const result = await service.create('owner-1', { name: 'Hair', color: '#ffaa00', sortOrder: 10 });

      expect(repo.findByNameInsensitive).toHaveBeenCalledWith('salon-1', 'Hair', undefined);
      expect(crm.createCategory).toHaveBeenCalledWith('salon-1', 'ALTEGIO', {
        name: 'Hair',
        color: '#FFAA00',
        sortOrder: 10,
      });
      expect(result).toMatchObject({
        id: 'cat-1',
        crmExternalId: '123',
        name: 'Hair',
        color: '#FFAA00',
      });
      expect(scheduler.scheduleSync).toHaveBeenCalledWith({ salonId: 'salon-1', provider: 'ALTEGIO' });
    });

    it('throws 409 when capability is missing', () => {
      prisma.salon.findFirst.mockResolvedValue({ id: 'salon-1', provider: 'EASYWEEK' });
      repo.findByNameInsensitive.mockResolvedValue(null);
      caps.has.mockImplementation((_provider, key) => key !== 'supportsCategoryCrud');

      return service
        .create('owner-1', { name: 'Hair' })
        .then(() => fail('Expected ConflictException'))
        .catch((error) => expect(error).toBeInstanceOf(ConflictException));
    });

    it('throws 409 on name conflict', async () => {
      prisma.salon.findFirst.mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      repo.findByNameInsensitive.mockResolvedValue({ id: 'existing' } as any);

      await service
        .create('owner-1', { name: 'Hair' })
        .then(() => fail('Expected ConflictException'))
        .catch((error) => expect(error).toBeInstanceOf(ConflictException));
      expect(crm.createCategory).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('prevents deletion when services exist', () => {
      prisma.salon.findFirst.mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      repo.findByIdWithinSalon.mockResolvedValue({ id: 'cat-1', crmExternalId: '123' } as any);
      repo.hasServices.mockResolvedValue(true);

      return service
        .delete('owner-1', 'cat-1')
        .then(() => fail('Expected ConflictException'))
        .catch((error) => expect(error).toBeInstanceOf(ConflictException));
    });

    it('throws NotFound when category missing', () => {
      prisma.salon.findFirst.mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      repo.findByIdWithinSalon.mockResolvedValue(null);

      return service
        .delete('owner-1', 'cat-1')
        .then(() => fail('Expected NotFoundException'))
        .catch((error) => expect(error).toBeInstanceOf(NotFoundException));
    });
  });

  describe('pullFromCrm', () => {
    it('upserts categories from CRM and removes stale ones', async () => {
      prisma.salon.findFirst.mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      caps.assert.mockImplementation(() => undefined);
      prisma.category.findMany
        .mockResolvedValueOnce([{ id: 'cat-old', crmExternalId: 'old-1' } as any])
        .mockResolvedValueOnce([
          {
            id: 'cat-new',
            salonId: 'salon-1',
            crmExternalId: '123',
            name: 'Hair',
            color: '#ABCDEF',
            sortOrder: 5,
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-02T00:00:00Z'),
          },
        ] as any);

      crm.pullCategories.mockResolvedValue({
        items: [
          { externalId: '123', name: 'Hair', color: '#abcdef', sortOrder: 5 },
        ],
        fetched: 1,
      });

      repo.upsertFromCrm.mockResolvedValue({
        id: 'cat-new',
        salonId: 'salon-1',
        crmExternalId: '123',
        name: 'Hair',
        color: '#ABCDEF',
        sortOrder: 5,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      } as any);

      const result = await service.pullFromCrm('owner-1');

      expect(caps.assert).toHaveBeenCalledWith('ALTEGIO', 'supportsCategoriesSync');
      expect(crm.pullCategories).toHaveBeenCalledWith('salon-1', 'ALTEGIO');
      expect(repo.upsertFromCrm).toHaveBeenCalledWith('salon-1', {
        crmExternalId: '123',
        name: 'Hair',
        color: '#ABCDEF',
        sortOrder: 5,
      });
      expect(prisma.category.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['cat-old'] } } });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        crmExternalId: '123',
        color: '#ABCDEF',
        sortOrder: 5,
      });
    });
  });
});
