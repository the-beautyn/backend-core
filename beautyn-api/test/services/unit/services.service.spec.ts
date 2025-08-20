import { Test } from '@nestjs/testing';
import { ServicesService } from '../../../src/services/services.service';
import { PrismaService } from '../../../src/shared/database/prisma.service';
import { createFakePrismaForServices } from '../utils/fakes.prisma.services';

describe('ServicesService', () => {
  let service: ServicesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = createFakePrismaForServices();
    const moduleRef = await Test.createTestingModule({
      providers: [ServicesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ServicesService);
  });

  describe('syncFromCrm full-replace', () => {
    it('upserts and deletes correctly', async () => {
      const snapshot1 = {
        salon_id: 's1',
        categories: [{ name: 'Cut' }],
        services: [
          { name: 'S1', duration_minutes: 30, price_cents: 1000, currency: 'USD' },
          { name: 'S2', duration_minutes: 60, price_cents: 2000, currency: 'USD' },
        ],
      };
      const res1 = await service.syncFromCrm(snapshot1);
      expect(res1).toEqual({ upserted: 2, deleted: 0, categories_upserted: 1 });
      expect(prisma.__db.services).toHaveLength(2);

      const snapshot2 = {
        salon_id: 's1',
        categories: [{ name: 'Cut' }],
        services: [{ name: 'S2', duration_minutes: 90, price_cents: 2500, currency: 'USD' }],
      };
      const res2 = await service.syncFromCrm(snapshot2);
      expect(res2).toEqual({ upserted: 1, deleted: 1, categories_upserted: 1 });
      expect(prisma.__db.services).toHaveLength(1);
      expect(prisma.__db.services[0].priceCents).toBe(2500);
    });
  });

  describe('list filters', () => {
    let catId: string;
    beforeEach(async () => {
      const cat = await prisma.category.upsert({
        create: { salonId: 's1', name: 'Cut', sortOrder: 1 },
      });
      catId = cat.id;
      await prisma.service.upsert({
        create: {
          salonId: 's1',
          categoryId: catId,
          name: 'Basic Cut',
          durationMinutes: 30,
          priceCents: 1000,
          currency: 'USD',
          isActive: true,
        },
      });
      await prisma.service.upsert({
        create: {
          salonId: 's1',
          categoryId: catId,
          name: 'Deluxe Cut',
          durationMinutes: 60,
          priceCents: 2000,
          currency: 'USD',
          isActive: true,
        },
      });
      await prisma.service.upsert({
        create: {
          salonId: 's1',
          categoryId: 'other',
          name: 'Color',
          durationMinutes: 45,
          priceCents: 1500,
          currency: 'USD',
          isActive: false,
        },
      });
      await prisma.service.upsert({
        create: {
          salonId: 's2',
          categoryId: catId,
          name: 'Other Salon',
          durationMinutes: 30,
          priceCents: 800,
          currency: 'USD',
          isActive: true,
        },
      });
    });

    it('filters by salon/category/q/active and paginates', async () => {
      const res = await service.list({
        salon_id: 's1',
        category_id: catId,
        q: 'cut',
        active: true,
        page: 1,
        limit: 1,
      });
      expect(res.page).toBe(1);
      expect(res.limit).toBe(1);
      expect(res.total).toBe(2);
      expect(res.items).toHaveLength(1);
      expect(res.items[0].name).toBe('Basic Cut');
    });
  });

  describe('listCategories', () => {
    beforeEach(async () => {
      await prisma.category.upsert({ create: { salonId: 's1', name: 'B', sortOrder: 1 } });
      await prisma.category.upsert({ create: { salonId: 's1', name: 'A', sortOrder: 1 } });
      await prisma.category.upsert({ create: { salonId: 's1', name: 'C', sortOrder: 2 } });
      await prisma.category.upsert({ create: { salonId: 's2', name: 'Z', sortOrder: 1 } });
    });

    it('returns sorted categories for salon', async () => {
      const res = await service.listCategories('s1');
      expect(res.map((c) => c.name)).toEqual(['A', 'B', 'C']);
    });
  });
});
