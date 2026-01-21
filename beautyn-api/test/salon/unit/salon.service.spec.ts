import { Test, TestingModule } from '@nestjs/testing';
import { SalonService } from '../../../src/salon/salon.service';
import { PrismaService } from '../../../src/shared/database/prisma.service';
import { createFakePrismaForSalon } from '../utils/fakes.prisma.salon';
import { ServicesRepository } from '../../../src/services/repositories/services.repo';
import { WorkersRepository } from '../../../src/workers/repositories/workers.repository';
import { CrmIntegrationService } from '../../../src/crm-integration/core/crm-integration.service';

describe('SalonService', () => {
  let service: SalonService;
  let prisma: ReturnType<typeof createFakePrismaForSalon>;
  let servicesRepo: { findBySalon: jest.Mock };
  let workersRepo: { listBySalon: jest.Mock };
  let crmIntegration: { pullSalonAndDetectChanges: jest.Mock };

  beforeEach(async () => {
    prisma = createFakePrismaForSalon();
    servicesRepo = { findBySalon: jest.fn() };
    workersRepo = { listBySalon: jest.fn() };
    crmIntegration = { pullSalonAndDetectChanges: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalonService,
        { provide: PrismaService, useValue: prisma },
        { provide: ServicesRepository, useValue: servicesRepo },
        { provide: WorkersRepository, useValue: workersRepo },
        { provide: CrmIntegrationService, useValue: crmIntegration },
      ],
    }).compile();

    service = module.get(SalonService);
  });

  it('upsertFromCrm updates when id matches', async () => {
    await service.upsertFromCrm({ salon_id: 's1', salon: { externalId: 'ext-1', name: 'First' } as any });
    await service.upsertFromCrm({ salon_id: 's1', salon: { externalId: 'ext-1', name: 'Updated' } as any });

    const list = await prisma.salon.findMany({});
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Updated');
  });

  it('list filters by city and q with paging', async () => {
    await prisma.salon.create({ data: { id: '1', name: 'Alpha', city: 'Kyiv' } });
    await prisma.salon.create({ data: { id: '2', name: 'Beta', city: 'Kyiv' } });
    await prisma.salon.create({ data: { id: '3', name: 'Gamma', city: 'Lviv' } });

    let res = await service.list({ city: 'Kyiv', page: 1, limit: 10 });
    expect(res.total).toBe(2);
    expect(res.items.every((i) => i.city === 'Kyiv')).toBe(true);

    res = await service.list({ q: 'et', page: 1, limit: 10 });
    expect(res.total).toBe(1);
    expect(res.items[0].name).toBe('Beta');

    res = await service.list({ page: 2, limit: 1 });
    expect(res.page).toBe(2);
    expect(res.limit).toBe(1);
    expect(res.total).toBe(3);
    expect(res.items).toHaveLength(1);
  });

  it('replaceImages fully replaces gallery', async () => {
    await prisma.salon.create({ data: { id: 's1', name: 'Salon', imagesCount: 2 } });
    await prisma.salonImage.createMany({
      data: [
        { salonId: 's1', imageUrl: 'url1', sortOrder: 1 },
        { salonId: 's1', imageUrl: 'url2', sortOrder: 2 },
      ],
    });

    const result = await service.replaceImages('s1', {
      items: [{ image_url: 'new1', sort_order: 1 }],
    });

    expect(result).toEqual({ count: 1 });
    const images = await prisma.salonImage.findMany({ where: { salonId: 's1' } });
    expect(images).toHaveLength(1);
    expect(images[0].imageUrl).toBe('new1');

    const salon = await prisma.salon.findFirst({ where: { id: 's1' } });
    expect(salon.imagesCount).toBe(1);
  });

  it('findById can include services, workers, categories, images', async () => {
    await prisma.salon.create({ data: { id: 's1', name: 'Salon' } });
    await prisma.salonImage.createMany({
      data: [
        { salonId: 's1', imageUrl: 'url1', sortOrder: 2 },
        { salonId: 's1', imageUrl: 'url2', sortOrder: 1 },
      ],
    });
    await prisma.category.createMany({
      data: [
        { id: 'c1', salonId: 's1', name: 'Hair', sortOrder: 2, crmCategoryId: null },
        { id: 'c2', salonId: 's1', name: 'Nails', sortOrder: 1, crmCategoryId: null },
      ],
    });

    servicesRepo.findBySalon.mockResolvedValue([
      {
        id: 'svc-1',
        salonId: 's1',
        categoryId: null,
        crmServiceId: null,
        name: 'Cut',
        description: null,
        duration: 60,
        price: 1000,
        currency: 'UAH',
        sortOrder: 2,
        workerIds: [],
        workerLinks: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'svc-2',
        salonId: 's1',
        categoryId: null,
        crmServiceId: null,
        name: 'Color',
        description: null,
        duration: 60,
        price: 1500,
        currency: 'UAH',
        sortOrder: 1,
        workerIds: [],
        workerLinks: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    workersRepo.listBySalon.mockResolvedValue([
      {
        id: 'w1',
        salonId: 's1',
        firstName: 'Jane',
        lastName: 'Doe',
        position: 'Stylist',
        description: null,
        photoUrl: null,
        crmWorkerId: null,
        role: null,
        email: null,
        phone: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const salon = await service.findById('s1', {
      services: true,
      workers: true,
      categories: true,
      images: true,
    });

    expect(salon?.services?.map((s) => s.id)).toEqual(['svc-2', 'svc-1']);
    expect(salon?.workers?.map((w) => w.id)).toEqual(['w1']);
    expect(salon?.categories?.map((c) => c.id)).toEqual(['c2', 'c1']);
    expect(salon?.images).toEqual(['url2', 'url1']);
  });
});
