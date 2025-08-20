import { Test, TestingModule } from '@nestjs/testing';
import { WorkersService } from '../../../src/workers/workers.service';
import { PrismaService } from '../../../src/shared/database/prisma.service';
import { createFakePrismaForWorkers } from '../utils/fakes.prisma.workers';

describe('WorkersService', () => {
  let service: WorkersService;
  let prisma: ReturnType<typeof createFakePrismaForWorkers>;

  beforeEach(async () => {
    prisma = createFakePrismaForWorkers();
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(WorkersService);
  });

  describe('syncFromCrm', () => {
    it('upserts workers, rebuilds skills, and is idempotent', async () => {
      const existing = await prisma.worker.create({
        data: {
          id: 'w1',
          salonId: 'salon1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          isActive: true,
        },
      });
      await prisma.workerService.createMany({
        data: [{ workerId: existing.id, serviceId: 'svc1' }],
      });

      const payload = {
        salon_id: 'salon1',
        workers: [
          {
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
            service_external_ids: ['ext2'],
          },
          {
            first_name: 'Anna',
            last_name: 'Smith',
            service_external_ids: ['ext1', 'ext3'],
          },
        ],
      };

      const res1 = await service.syncFromCrm(payload as any);
      expect(res1).toEqual({ upserted: 2, unlinked: 1 });
      const all = await prisma.worker.findMany({ where: { salonId: 'salon1' } });
      expect(all).toHaveLength(2);
      const w1Links = await prisma.workerService.findMany({ where: { workerId: existing.id } });
      expect(w1Links.map((l) => l.serviceId)).toEqual(['svc2']);

      const res2 = await service.syncFromCrm(payload as any);
      expect(res2).toEqual({ upserted: 2, unlinked: 3 });
      const workersAfter = await prisma.worker.findMany({ where: { salonId: 'salon1' } });
      expect(workersAfter).toHaveLength(2);
      const linksAfter = await prisma.workerService.findMany({});
      expect(linksAfter).toHaveLength(3);
    });
  });

  describe('list', () => {
    it('filters by active and search query with pagination', async () => {
      await prisma.worker.create({
        data: {
          id: 'w1',
          salonId: 'salon1',
          firstName: 'John',
          lastName: 'Doe',
          isActive: true,
        },
      });
      await prisma.worker.create({
        data: {
          id: 'w2',
          salonId: 'salon1',
          firstName: 'Alice',
          lastName: 'Johnson',
          isActive: true,
        },
      });
      await prisma.worker.create({
        data: {
          id: 'w3',
          salonId: 'salon1',
          firstName: 'Mike',
          lastName: 'Brown',
          isActive: false,
        },
      });

      const page1 = await service.list({ salon_id: 'salon1', q: 'john', active: true, page: 1, limit: 1 } as any);
      expect(page1.page).toBe(1);
      expect(page1.limit).toBe(1);
      expect(page1.total).toBe(2);
      expect(page1.items).toHaveLength(1);
      expect(page1.items[0].first_name).toBe('John');

      const page2 = await service.list({ salon_id: 'salon1', q: 'john', active: true, page: 2, limit: 1 } as any);
      expect(page2.items).toHaveLength(1);
      expect(page2.items[0].last_name).toBe('Johnson');
    });
  });

  describe('availability', () => {
    it('uses schedule when provided else default slots', async () => {
      const worker = await prisma.worker.create({
        data: {
          id: 'w1',
          salonId: 'salon1',
          firstName: 'Tom',
          lastName: 'Test',
          isActive: true,
          workSchedule: { mon: [{ from: '10:00', to: '12:00' }] },
        },
      });

      const mon = await service.availability(worker.id, { date: '2024-04-29' } as any);
      expect(mon.slots).toEqual([{ from: '10:00', to: '12:00' }]);

      const tue = await service.availability(worker.id, { date: '2024-04-30' } as any);
      expect(tue.slots).toHaveLength(18);
      expect(tue.slots[0]).toEqual({ from: '09:00', to: '09:30' });
      expect(tue.slots[17]).toEqual({ from: '17:30', to: '18:00' });
    });
  });
});

