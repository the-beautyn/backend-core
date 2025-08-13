import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/database/prisma.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { JwtAuthGuard } from '../src/shared/guards/jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { SharedModule } from '../src/shared/shared.module';
import { SupabaseModule } from '../src/shared/supabase/supabase.module';
import { PublicApiModule } from '../src/api-gateway/public-api.module';
import { AuthenticatedApiModule } from '../src/api-gateway/authenticated-api.module';

describe('User Auth + Profile Creation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let supabaseClient: SupabaseClient;

  let mockUserId: string;
  const mockAccessToken = 'mock-access-token';

  beforeAll(async () => {
    const mockJwtGuard = {
      canActivate: jest.fn().mockImplementation((context) => {
        const req = context.switchToHttp().getRequest();
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          req.user = { id: mockUserId, role: 'client' };
          return true;
        }
        return false;
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SharedModule, SupabaseModule, PublicApiModule, AuthenticatedApiModule],
    })
      .overrideProvider(SupabaseClient)
      .useValue({
        auth: {
          signUp: jest.fn(),
          signInWithPassword: jest.fn(),
          signOut: jest.fn(),
          resetPasswordForEmail: jest.fn(),
          verifyOtp: jest.fn(),
          updateUser: jest.fn(),
          setSession: jest.fn(),
          getUser: jest.fn(),
        },
      })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Align with main.ts setup for validation (ensures DTO validation behavior matches runtime)
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }));

    prisma = app.get<PrismaService>(PrismaService);
    supabaseClient = app.get<SupabaseClient>(SupabaseClient);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.users.deleteMany();
  });

  it('registers, updates profile, and fetches profile using real Postgres', async () => {
    mockUserId = randomUUID();
    const email = 'flow-user@example.com';
    const password = 'Password123!';

    // Mock Supabase signUp to return session and the same user id we assert with
    (supabaseClient.auth.signUp as jest.Mock).mockResolvedValue({
      data: {
        user: { id: mockUserId, email },
        session: {
          access_token: mockAccessToken,
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
        },
      },
      error: null,
    });

    // 1) Register → should create a DB row (Postgres via Prisma)
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, role: 'client' })
      .expect(201);

    expect(registerRes.body).toEqual({
      accessToken: mockAccessToken,
      refreshToken: 'mock-refresh-token',
      expiresIn: 3600,
    });

    const created = await prisma.users.findUnique({ where: { email } });
    expect(created).toBeDefined();
    expect(created?.id).toBe(mockUserId);
    expect(created?.role).toBe(UserRole.client);
    expect(created?.isProfileCreated).toBe(false);

    // quick sanity check that authenticated routes are registered
    await request(app.getHttpServer())
      .get('/api/v1/user/me')
      .set('Authorization', `Bearer ${mockAccessToken}`)
      .expect(200);

    // 2) Update profile (authenticated)
    const updateDto = {
      name: 'Jane',
      second_name: 'Doe',
      phone: '+12125551234',
    };

    const updateRes = await request(app.getHttpServer())
      .patch('/api/v1/user/update')
      .set('Authorization', `Bearer ${mockAccessToken}`)
      .send(updateDto)
      .expect(200);

    expect(updateRes.body).toMatchObject({
      email,
      name: 'Jane',
      second_name: 'Doe',
      phone: '+12125551234',
      is_profile_created: true, // client requires first+second name
    });

    // 3) Fetch current profile
    const meRes = await request(app.getHttpServer())
      .get('/api/v1/user/me')
      .set('Authorization', `Bearer ${mockAccessToken}`)
      .expect(200);

    expect(meRes.body).toMatchObject({
      id: mockUserId,
      email,
      name: 'Jane',
      second_name: 'Doe',
      phone: '+12125551234',
      is_profile_created: true,
    });
  });
});


