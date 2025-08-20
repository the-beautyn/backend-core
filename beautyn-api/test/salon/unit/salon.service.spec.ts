import { Test, TestingModule } from '@nestjs/testing';
import { SalonService } from '../../../src/salon/salon.service';
import { PrismaService } from '../../../src/shared/database/prisma.service';
import { createFakePrismaForSalon } from '../utils/fakes.prisma.salon';

describe('SalonService', () => {
  let service: SalonService;
  let prisma: ReturnType<typeof createFakePrismaForSalon>;

  beforeEach(async () => {
    prisma = createFakePrismaForSalon();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalonService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SalonService);
  });

  it('upsertFromCrm is idempotent by crm_id', async () => {
    await service.upsertFromCrm({ crm_id: 'crm1', name: 'First' });
    await service.upsertFromCrm({ crm_id: 'crm1', name: 'Updated' });

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
});
