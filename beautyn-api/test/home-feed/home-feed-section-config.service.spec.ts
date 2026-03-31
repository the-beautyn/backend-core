import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HomeFeedSectionConfigService } from '../../src/home-feed/home-feed-section-config.service';

describe('HomeFeedSectionConfigService', () => {
  const repo = {
    listAll: jest.fn(),
    listActive: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as any;

  const prisma = {
    appCategory: {
      findUnique: jest.fn(),
    },
  } as any;

  const service = new HomeFeedSectionConfigService(repo, prisma);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('list', () => {
    it('returns all sections from repo', async () => {
      const sections = [
        { id: 's1', type: 'popular', title: 'Popular', sortOrder: 0 },
        { id: 's2', type: 'category', title: 'Nails', sortOrder: 1 },
      ];
      repo.listAll.mockResolvedValue(sections);

      const result = await service.list();

      expect(result).toEqual(sections);
      expect(repo.listAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('creates a section without filters', async () => {
      const dto = { type: 'popular', title: 'Popular Salons', sortOrder: 0 };
      const created = { id: 's1', ...dto, limit: 10, isActive: true, emoji: null, filters: null };
      repo.create.mockResolvedValue(created);

      const result = await service.create(dto as any);

      expect(result).toEqual(created);
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        type: 'popular',
        title: 'Popular Salons',
        sortOrder: 0,
        limit: 10,
        isActive: true,
      }));
    });

    it('creates a section with appCategoryId in filters', async () => {
      const catId = 'cat-uuid-1';
      const dto = { type: 'category', title: 'Nails', sortOrder: 1, filters: { appCategoryId: catId } };
      prisma.appCategory.findUnique.mockResolvedValue({ id: catId });
      repo.create.mockResolvedValue({ id: 's2', ...dto });

      await service.create(dto as any);

      expect(prisma.appCategory.findUnique).toHaveBeenCalledWith({ where: { id: catId } });
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        type: 'category',
        filters: { appCategoryId: catId },
      }));
    });

    it('throws BadRequestException when filters.appCategoryId does not exist', async () => {
      const dto = { type: 'category', title: 'Nails', sortOrder: 1, filters: { appCategoryId: 'nonexistent' } };
      prisma.appCategory.findUnique.mockResolvedValue(null);

      await expect(service.create(dto as any)).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('does not validate appCategory when not in filters', async () => {
      const dto = { type: 'popular', title: 'Top', sortOrder: 0, filters: { sortBy: 'popular' } };
      repo.create.mockResolvedValue({ id: 's3', ...dto });

      await service.create(dto as any);

      expect(prisma.appCategory.findUnique).not.toHaveBeenCalled();
    });

    it('uses provided limit and isActive', async () => {
      const dto = { type: 'popular', title: 'Top', sortOrder: 0, limit: 5, isActive: false };
      repo.create.mockResolvedValue({ id: 's3', ...dto });

      await service.create(dto as any);

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        limit: 5,
        isActive: false,
      }));
    });
  });

  describe('update', () => {
    const existing = {
      id: 's1',
      type: 'popular',
      title: 'Popular',
      emoji: null,
      sortOrder: 0,
      limit: 10,
      isActive: true,
      filters: null,
    };

    it('updates title', async () => {
      repo.findById.mockResolvedValue(existing);
      repo.update.mockResolvedValue({ ...existing, title: 'Best Salons' });

      const result = await service.update('s1', { title: 'Best Salons' } as any);

      expect(result.title).toBe('Best Salons');
      expect(repo.update).toHaveBeenCalledWith('s1', { title: 'Best Salons' });
    });

    it('throws NotFoundException when section does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.update('s99', { title: 'X' } as any)).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('validates filters.appCategoryId on update', async () => {
      repo.findById.mockResolvedValue(existing);

      await expect(
        service.update('s1', { filters: { appCategoryId: 'nonexistent' } } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows update with valid appCategoryId in filters', async () => {
      repo.findById.mockResolvedValue(existing);
      prisma.appCategory.findUnique.mockResolvedValue({ id: 'cat1' });
      repo.update.mockResolvedValue({ ...existing, filters: { appCategoryId: 'cat1' } });

      await service.update('s1', { filters: { appCategoryId: 'cat1' } } as any);

      expect(repo.update).toHaveBeenCalledWith('s1', expect.objectContaining({
        filters: { appCategoryId: 'cat1' },
      }));
    });
  });

  describe('delete', () => {
    it('deletes an existing section', async () => {
      repo.findById.mockResolvedValue({ id: 's1' });
      repo.delete.mockResolvedValue({ id: 's1' });

      await service.delete('s1');

      expect(repo.delete).toHaveBeenCalledWith('s1');
    });

    it('throws NotFoundException when section does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.delete('s99')).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});
