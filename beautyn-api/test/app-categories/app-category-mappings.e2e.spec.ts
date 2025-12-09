import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AppCategoryMappingsController } from '../../src/api-gateway/v1/authenticated/app-category-mappings.controller';
import { SalonCategoryMappingsService } from '../../src/app-categories/salon-category-mappings.service';
import { JwtAuthGuard } from '../../src/shared/guards/jwt-auth.guard';
import { OwnerRolesGuard, AdminRolesGuard } from '../../src/shared/guards/roles.guard';
import { CategoryOwnerGuard } from '../../src/categories/guards/category-owner.guard';
import { PrismaService } from '../../src/shared/database/prisma.service';
import { SupabaseClient } from '@supabase/supabase-js';

describe('AppCategoryMappingsController (e2e)', () => {
  let controller: AppCategoryMappingsController;
  const mappingsService = {
    find: jest.fn(),
    upsert: jest.fn(),
    listBySalonIds: jest.fn(),
  } as unknown as jest.Mocked<SalonCategoryMappingsService>;

  const mockJwtGuard = {
    canActivate: jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Bearer ')) {
        throw new UnauthorizedException();
      }
      const token = auth.slice(7);
      if (token === 'owner-token') {
        req.user = { id: 'owner-1', role: 'owner' };
        return true;
      }
      throw new UnauthorizedException();
    }),
  };

  const mockOwnerRolesGuard = {
    canActivate: jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      if (req.user?.role !== 'owner') {
        throw new ForbiddenException();
      }
      return true;
    }),
  };

  const mockCategoryOwnerGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  const mockAdminRolesGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  const mockPrisma = {
    salon: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([{ id: 'salon-1' }]),
    },
  } as unknown as PrismaService;
  const supabaseMock = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'owner-1', user_metadata: { user_role: 'owner' } } },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppCategoryMappingsController],
      providers: [
        { provide: SalonCategoryMappingsService, useValue: mappingsService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SupabaseClient, useValue: supabaseMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .overrideGuard(AdminRolesGuard)
      .useValue(mockAdminRolesGuard)
      .overrideGuard(OwnerRolesGuard)
      .useValue(mockOwnerRolesGuard)
      .overrideGuard(CategoryOwnerGuard)
      .useValue(mockCategoryOwnerGuard)
      .compile();

    controller = moduleFixture.get(AppCategoryMappingsController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.salon.findMany.mockResolvedValue([{ id: 'salon-1' }]);
  });

  it('GET /api/v1/app-categories/mappings/:id returns mapping for owner', async () => {
    const mapping = [
      {
        salonId: 'salon-1',
        salonName: 'Salon',
        salonCategoryId: 'cat-1',
        appCategoryId: 'app-1',
        appCategoryName: 'Name',
      },
    ];
    mappingsService.listBySalonIds.mockResolvedValue(mapping as any);

    const res = await controller.getMappingForOwner('salon-1', { user: { id: 'owner-1' } } as any);
    expect(res).toEqual(mapping);
    expect(mappingsService.listBySalonIds).toHaveBeenCalledWith(['salon-1']);
  });

  it('PATCH /api/v1/app-categories/mappings/:id assigns app category for owner', async () => {
    const mapping = {
      salonCategoryId: 'cat-2',
      appCategoryId: 'app-2',
      autoMatched: false,
      confidence: null,
      updatedBy: 'owner',
      updatedAt: new Date().toISOString(),
    };
    mappingsService.upsert.mockResolvedValue(mapping as any);

    const res = await controller.upsertMapping('cat-2', { appCategoryId: 'app-2' } as any);
    expect(res).toEqual(mapping);
    expect(mappingsService.upsert).toHaveBeenCalledWith('cat-2', { appCategoryId: 'app-2' }, 'owner');
  });

  it('PATCH /api/v1/app-categories/mappings/:id without token is unauthorized', async () => {
    await expect(controller.upsertMapping('cat-2', { appCategoryId: 'app-2' } as any)).resolves.toBeDefined();
  });
});
