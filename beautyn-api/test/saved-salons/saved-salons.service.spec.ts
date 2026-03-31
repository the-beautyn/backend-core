import { NotFoundException } from '@nestjs/common';
import { SavedSalonsService } from '../../src/saved-salons/saved-salons.service';

describe('SavedSalonsService', () => {
  const repo = {
    save: jest.fn(),
    unsave: jest.fn(),
    listByUser: jest.fn(),
    countByUser: jest.fn(),
    isSavedBatch: jest.fn(),
    findByUserAndSalon: jest.fn(),
  } as any;

  const prisma = {
    salon: {
      findFirst: jest.fn(),
    },
  } as any;

  const service = new SavedSalonsService(repo, prisma);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('save', () => {
    it('saves when salon exists and is not deleted', async () => {
      prisma.salon.findFirst.mockResolvedValue({ id: 's1', deletedAt: null });
      repo.save.mockResolvedValue({});

      await service.save('u1', 's1');

      expect(prisma.salon.findFirst).toHaveBeenCalledWith({ where: { id: 's1', deletedAt: null } });
      expect(repo.save).toHaveBeenCalledWith('u1', 's1');
    });

    it('throws NotFoundException when salon does not exist', async () => {
      prisma.salon.findFirst.mockResolvedValue(null);

      await expect(service.save('u1', 's1')).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when salon is soft-deleted', async () => {
      prisma.salon.findFirst.mockResolvedValue(null);

      await expect(service.save('u1', 's1')).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('unsave', () => {
    it('delegates to repo.unsave', async () => {
      repo.unsave.mockResolvedValue(undefined);

      await service.unsave('u1', 's1');

      expect(repo.unsave).toHaveBeenCalledWith('u1', 's1');
    });
  });

  describe('listByUser', () => {
    const now = new Date('2026-03-01T12:00:00.000Z');

    it('returns paginated list with defaults', async () => {
      repo.listByUser.mockResolvedValue([
        {
          id: 'ss1',
          salonId: 's1',
          createdAt: now,
          salon: {
            id: 's1',
            name: 'Salon One',
            coverImageUrl: 'https://img.test/1.jpg',
            addressLine: '123 Main St',
            city: 'Kyiv',
            ratingAvg: '4.5',
            ratingCount: 120,
          },
        },
      ]);
      repo.countByUser.mockResolvedValue(1);

      const result = await service.listByUser('u1', {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        id: 'ss1',
        salonId: 's1',
        salonName: 'Salon One',
        coverImageUrl: 'https://img.test/1.jpg',
        addressLine: '123 Main St',
        city: 'Kyiv',
        ratingAvg: 4.5,
        ratingCount: 120,
        savedAt: now.toISOString(),
      });

      expect(repo.listByUser).toHaveBeenCalledWith('u1', 0, 20, undefined);
      expect(repo.countByUser).toHaveBeenCalledWith('u1', undefined);
    });

    it('respects page and limit params', async () => {
      repo.listByUser.mockResolvedValue([]);
      repo.countByUser.mockResolvedValue(0);

      const result = await service.listByUser('u1', { page: 3, limit: 10 });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(repo.listByUser).toHaveBeenCalledWith('u1', 20, 10, undefined);
    });

    it('passes name filter from query.q', async () => {
      repo.listByUser.mockResolvedValue([]);
      repo.countByUser.mockResolvedValue(0);

      await service.listByUser('u1', { q: 'beauty' });

      expect(repo.listByUser).toHaveBeenCalledWith('u1', 0, 20, 'beauty');
      expect(repo.countByUser).toHaveBeenCalledWith('u1', 'beauty');
    });

    it('caps limit at 100', async () => {
      repo.listByUser.mockResolvedValue([]);
      repo.countByUser.mockResolvedValue(0);

      const result = await service.listByUser('u1', { limit: 500 });

      expect(result.limit).toBe(100);
      expect(repo.listByUser).toHaveBeenCalledWith('u1', 0, 100, undefined);
    });

    it('handles null ratingAvg', async () => {
      repo.listByUser.mockResolvedValue([
        {
          id: 'ss2',
          salonId: 's2',
          createdAt: now,
          salon: {
            id: 's2',
            name: 'No Rating Salon',
            coverImageUrl: null,
            addressLine: null,
            city: null,
            ratingAvg: null,
            ratingCount: null,
          },
        },
      ]);
      repo.countByUser.mockResolvedValue(1);

      const result = await service.listByUser('u1', {});

      expect(result.items[0].ratingAvg).toBeNull();
      expect(result.items[0].ratingCount).toBeNull();
      expect(result.items[0].coverImageUrl).toBeNull();
    });
  });

  describe('isSavedBatch', () => {
    it('returns Set of saved salon IDs', async () => {
      repo.isSavedBatch.mockResolvedValue(['s1', 's3']);

      const result = await service.isSavedBatch('u1', ['s1', 's2', 's3']);

      expect(result).toBeInstanceOf(Set);
      expect(result.has('s1')).toBe(true);
      expect(result.has('s2')).toBe(false);
      expect(result.has('s3')).toBe(true);
    });

    it('returns empty Set when nothing is saved', async () => {
      repo.isSavedBatch.mockResolvedValue([]);

      const result = await service.isSavedBatch('u1', ['s1']);

      expect(result.size).toBe(0);
    });
  });
});
