import { Test } from '@nestjs/testing';
import { INestApplication, ExecutionContext, Global, Module } from '@nestjs/common';
import request from 'supertest';
import { AuthenticatedModule } from '../authenticated.module';
import { UserService } from '../../../../user/user.service';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { UpdateUserDto } from '../../../../user/dto/update-user.dto';
import { SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../../../../shared/database/prisma.service';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  const mockUserService = {
    findById: jest.fn(),
    updateProfile: jest.fn(),
  } as unknown as jest.Mocked<UserService>;

  const user = {
    id: 'test-user-1',
    email: 'user@example.com',
    role: 'client',
    name: null,
    second_name: null,
    phone: null,
    avatar_url: null,
    is_profile_created: false,
    is_onboarding_completed: false,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  };

  @Global()
  @Module({
    providers: [{ provide: SupabaseClient, useValue: {} }],
    exports: [SupabaseClient],
  })
  class SupabaseMockModule {}

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SupabaseMockModule, AuthenticatedModule],
    })
      .overrideProvider(UserService)
      .useValue(mockUserService)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 'test-user-1' };
          return true;
        },
      })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /user/me returns current user', async () => {
    mockUserService.findById.mockResolvedValue(user);
    await request(app.getHttpServer())
      .get('/user/me')
      .expect(200)
      .expect(user);
  });

  it('PATCH /user/update updates and validates', async () => {
    const payload: UpdateUserDto = {
      name: 'John',
      second_name: 'Doe',
      phone: '+12345678901',
    };
    const updated = { ...user, ...payload, is_profile_created: true };
    mockUserService.updateProfile.mockResolvedValue(updated);

    await request(app.getHttpServer())
      .patch('/user/update')
      .send(payload)
      .expect(200)
      .expect(updated);
  });
});
