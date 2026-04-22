import { Test, TestingModule } from '@nestjs/testing';
import { WorkersService } from '../../../src/workers/workers.service';
import { PrismaService } from '../../../src/shared/database/prisma.service';
import { createFakePrismaForWorkers } from '../utils/fakes.prisma.workers';
import { WorkersRepository } from '../../../src/workers/repositories/workers.repository';
import { WorkersCategory } from '../../../src/workers/category/workers.category';
import { CrmIntegrationService } from '../../../src/crm-integration/core/crm-integration.service';
import { CapabilityRegistryService } from '@crm/capability-registry';

describe('WorkersService', () => {
  let service: WorkersService;
  let prisma: ReturnType<typeof createFakePrismaForWorkers>;

  beforeEach(async () => {
    prisma = createFakePrismaForWorkers();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkersService,
        WorkersRepository,
        WorkersCategory,
        { provide: PrismaService, useValue: prisma },
        { provide: CrmIntegrationService, useValue: {} },
        {
          provide: CapabilityRegistryService,
          useValue: {
            assert: jest.fn(),
            has: jest.fn(),
            get: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get(WorkersService);
  });

  describe('listPublic', () => {
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

      const page1 = await service.listPublic({ salon_id: 'salon1', q: 'john', active: true, page: 1, limit: 1 } as any);
      expect(page1.page).toBe(1);
      expect(page1.limit).toBe(1);
      expect(page1.total).toBe(2);
      expect(page1.items).toHaveLength(1);
      expect(page1.items[0].first_name).toBe('John');

      const page2 = await service.listPublic({ salon_id: 'salon1', q: 'john', active: true, page: 2, limit: 1 } as any);
      expect(page2.items).toHaveLength(1);
      expect(page2.items[0].last_name).toBe('Johnson');
    });
  });

});
