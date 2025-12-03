import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from '../../../src/categories/categories.service';
import { CategoriesRepository } from '../../../src/categories/repositories/categories.repo';
import { CrmIntegrationService } from '../../../src/crm-integration/core/crm-integration.service';
import { PrismaService } from '../../../src/shared/database/prisma.service';
import { AppCategoriesService } from '../../../src/app-categories/app-categories.service';
import { SalonCategoryMappingsService } from '../../../src/app-categories/salon-category-mappings.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repo: jest.Mocked<CategoriesRepository>;
  let prisma: jest.Mocked<PrismaService>;
  let integration: jest.Mocked<CrmIntegrationService>;
  let appCategories: jest.Mocked<AppCategoriesService>;
  let categoryMappings: jest.Mocked<SalonCategoryMappingsService>;

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

    integration = {
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      pullCategories: jest.fn(),
      rebaseCategoriesNow: jest.fn(),
      enqueueCategoriesSync: jest.fn(),
    } as unknown as jest.Mocked<CrmIntegrationService>;

    appCategories = {
      findActiveForMatching: jest.fn().mockResolvedValue([]),
      matchByName: jest.fn().mockReturnValue(null),
    } as unknown as jest.Mocked<AppCategoriesService>;

    categoryMappings = {
      autoMatchAndUpsert: jest.fn(),
    } as unknown as jest.Mocked<SalonCategoryMappingsService>;

    service = new CategoriesService(repo, prisma, integration, appCategories, categoryMappings);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates category via CRM when supported', async () => {
      (prisma.salon.findFirst as any).mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      repo.findByNameInsensitive.mockResolvedValue(null);
      integration.createCategory.mockResolvedValue({ externalId: '123', name: 'Hair', sortOrder: 10, color: '#FFAA00' } as any);
      repo.upsertFromCrm.mockResolvedValue({
        id: 'cat-1',
        salonId: 'salon-1',
        crmCategoryId: '123',
        name: 'Hair',
        color: '#FFAA00',
        sortOrder: 10,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      } as any);

      const result = await service.create('owner-1', { title: 'Hair', weight: 10 });

      expect(repo.findByNameInsensitive).toHaveBeenCalledWith('salon-1', 'Hair', undefined);
      expect(integration.createCategory).toHaveBeenCalledWith('salon-1', 'ALTEGIO', {
        title: 'Hair',
        weight: 10,
        staff: undefined,
      });
      expect(result).toMatchObject({
        id: 'cat-1',
        crmCategoryId: '123',
        name: 'Hair',
        color: '#FFAA00',
      });
      // scheduling is internal to other flows now, do not assert
    });

    it('creates even when category CRUD capability is absent', async () => {
      (prisma.salon.findFirst as any).mockResolvedValue({ id: 'salon-1', provider: 'EASYWEEK' });
      repo.findByNameInsensitive.mockResolvedValue(null);
      integration.createCategory.mockResolvedValue({ externalId: '1', name: 'Hair' } as any);
      repo.upsertFromCrm.mockResolvedValue({ id: 'x', salonId: 'salon-1', crmCategoryId: '1', name: 'Hair' } as any);

      const res = await service.create('owner-1', { title: 'Hair' });
      expect(integration.createCategory).toHaveBeenCalled();
      expect(res.name).toBe('Hair');
    });

    it('throws 409 on name conflict', async () => {
      (prisma.salon.findFirst as any).mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      repo.findByNameInsensitive.mockResolvedValue({ id: 'existing' } as any);

      await service
        .create('owner-1', { title: 'Hair' })
        .then(() => fail('Expected ConflictException'))
        .catch((error) => expect(error).toBeInstanceOf(ConflictException));
      expect(integration.createCategory).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('prevents deletion when services exist', () => {
      (prisma.salon.findFirst as any).mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      repo.findByIdWithinSalon.mockResolvedValue({ id: 'cat-1', crmCategoryId: '123' } as any);
      repo.hasServices.mockResolvedValue(true);

      return service
        .delete('owner-1', 'cat-1')
        .then(() => fail('Expected ConflictException'))
        .catch((error) => expect(error).toBeInstanceOf(ConflictException));
    });

    it('throws NotFound when category missing', () => {
      (prisma.salon.findFirst as any).mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      repo.findByIdWithinSalon.mockResolvedValue(null);

      return service
        .delete('owner-1', 'cat-1')
        .then(() => fail('Expected NotFoundException'))
        .catch((error) => expect(error).toBeInstanceOf(NotFoundException));
    });
  });

  describe('update', () => {
    it('returns existing category when dto is empty', async () => {
      (prisma.salon.findFirst as any).mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      const existing = { id: 'cat-1', name: 'Existing', crmCategoryId: 'ext-1' } as any;
      repo.findById.mockResolvedValue(existing);

      const res = await service.update('owner-1', 'cat-1', {} as any);
      expect(repo.findById).toHaveBeenCalledWith('cat-1');
      expect(res.id).toBe('cat-1');
      expect(res.name).toBe('Existing');
      expect(integration.updateCategory).not.toHaveBeenCalled();
    });

    it('throws conflict when category is not linked to CRM', async () => {
      (prisma.salon.findFirst as any).mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      repo.findByIdWithinSalon.mockResolvedValue({ id: 'cat-1', crmCategoryId: null } as any);

      await service
        .update('owner-1', 'cat-1', { title: 'New Name' } as any)
        .then(() => fail('Expected ConflictException'))
        .catch((e) => expect(e).toBeInstanceOf(ConflictException));
      expect(integration.updateCategory).not.toHaveBeenCalled();
    });

    it('applies CRM response values and falls back to patch when missing', async () => {
      (prisma.salon.findFirst as any).mockResolvedValue({ id: 'salon-1', provider: 'ALTEGIO' });
      repo.findByIdWithinSalon.mockResolvedValue({ id: 'cat-1', crmCategoryId: 'ext-1' } as any);
      integration.updateCategory.mockResolvedValue({
        externalId: 'ext-1',
        name: 'From CRM',
        color: '#112233',
        sortOrder: 5,
      } as any);
      (repo.update as any).mockImplementation((_id: string, data: any) => ({ id: 'cat-1', ...data }));

      const res = await service.update('owner-1', 'cat-1', { title: 'Patch Name', weight: 3 } as any);

      expect(integration.updateCategory).toHaveBeenCalledWith('salon-1', 'ALTEGIO', 'ext-1', expect.objectContaining({ title: 'Patch Name', weight: 3 }));
      expect(repo.update).toHaveBeenCalledWith('cat-1', expect.objectContaining({ name: 'From CRM', color: '#112233', sortOrder: 5 }));
      expect(res.name).toBe('From CRM');
      expect(res.sortOrder).toBe(5);
    });
  });

  describe('listPublic', () => {
    it('throws BadRequest when salonId is missing', async () => {
      await service
        .listPublic({} as any)
        .then(() => fail('Expected BadRequestException'))
        .catch((e) => expect(e).toBeInstanceOf(BadRequestException));
    });
  });

  describe('syncFromCrm', () => {
    it('upserts categories from CRM payload and removes stale ones', async () => {
      // existing in DB
      (prisma.category.findMany as any) = jest.fn()
        .mockResolvedValueOnce([{ id: 'cat-old', name: 'Old', crmCategoryId: 'old-1' }])
        .mockResolvedValueOnce([
          { id: 'cat-new', salonId: 'salon-1', crmCategoryId: '123', name: 'Hair', color: '#ABCDEF', sortOrder: 5 },
        ]);
      (prisma as any).category.update = jest.fn().mockImplementation(({ where, data }: any) => ({ id: where.id, ...data }));
      (prisma as any).category.create = jest.fn().mockImplementation(({ data }: any) => ({ id: 'cat-new', ...data }));
      (prisma as any).category.deleteMany = jest.fn().mockResolvedValue({ count: 1 });

      const result = await service.syncFromCrm({
        salon_id: 'salon-1',
        categories: [{ crm_category_id: '123', name: 'Hair', color: '#abcdef', sort_order: 5 }],
      } as any);

      expect(prisma.category.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['cat-old'] } } });
      expect(result).toEqual({ upserted: 1, deleted: 1, categories: [expect.objectContaining({ name: 'Hair', color: '#ABCDEF', sortOrder: 5 })] });
    });
  });
});
