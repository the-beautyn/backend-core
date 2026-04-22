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
import { StorageModule } from '../src/shared/storage/storage.module';

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

    // In-memory Prisma mock for users
    const memUsers: any[] = [];
    const prismaMock: Partial<PrismaService> = {
      users: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          const row = {
            role: 'client',
            isProfileCreated: false,
            ...data,
          };
          memUsers.push(row);
          return row;
        }),
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where?.email) return memUsers.find((u) => u.email === where.email) || null;
          if (where?.id) return memUsers.find((u) => u.id === where.id) || null;
          return null;
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const idx = memUsers.findIndex((u) => u.id === where.id || u.email === where.email);
          if (idx < 0) throw new Error('User not found');
          memUsers[idx] = { ...memUsers[idx], ...data };
          const u = memUsers[idx];
          if (u.name && u.secondName) u.isProfileCreated = true;
          return memUsers[idx];
        }),
        deleteMany: jest.fn().mockImplementation(({ where }: any = {}) => {
          if (where?.email?.in && Array.isArray(where.email.in)) {
            const set = new Set(where.email.in);
            const before = memUsers.length;
            for (let i = memUsers.length - 1; i >= 0; i--) {
              if (set.has(memUsers[i].email)) memUsers.splice(i, 1);
            }
            return { count: before - memUsers.length };
          }
          const count = memUsers.length; memUsers.length = 0; return { count };
        }),
      } as any,
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SharedModule, SupabaseModule, StorageModule, PublicApiModule, AuthenticatedApiModule],
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
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
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
    // No global purge against real DB
  });

  afterEach(async () => {
    // Remove only the users created by this suite
    const testEmails = [
      'flow-user@example.com',
      'login-created@example.com',
      'login-incomplete@example.com',
    ];
    try {
      await prisma.users.deleteMany({ where: { email: { in: testEmails } } } as any);
    } catch (_) {
      // ignore
    }
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
      access_token: mockAccessToken,
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      phone_verification_required: true,
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

  it('logs in with an already created profile and fetches it', async () => {
    mockUserId = randomUUID();
    const email = 'login-created@example.com';
    const password = 'Password123!';

    // Seed an already-created profile
    await prisma.users.create({
      data: {
        id: mockUserId,
        email,
        role: UserRole.client,
        name: 'Alice',
        secondName: 'Smith',
        phone: '+12125550000',
        avatarUrl: 'https://example.com/avatar.png',
        isProfileCreated: true,
      },
    });

    // Mock Supabase login
    (supabaseClient.auth.signInWithPassword as jest.Mock).mockResolvedValue({
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

    // 1) Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    expect(loginRes.body).toEqual({
      access_token: mockAccessToken,
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      phone_verification_required: true,
    });

    // 2) Get current user
    const meRes = await request(app.getHttpServer())
      .get('/api/v1/user/me')
      .set('Authorization', `Bearer ${mockAccessToken}`)
      .expect(200);

    expect(meRes.body).toMatchObject({
      id: mockUserId,
      email,
      name: 'Alice',
      second_name: 'Smith',
      phone: '+12125550000',
      avatar_url: 'https://example.com/avatar.png',
      is_profile_created: true,
    });
  });

  it('logs in with incomplete profile, completes it, and finishes', async () => {
    mockUserId = randomUUID();
    const email = 'login-incomplete@example.com';
    const password = 'Password123!';

    // Seed an incomplete profile
    await prisma.users.create({
      data: {
        id: mockUserId,
        email,
        role: UserRole.client,
        isProfileCreated: false,
      },
    });

    // Mock Supabase login
    (supabaseClient.auth.signInWithPassword as jest.Mock).mockResolvedValue({
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

    // 1) Login
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    // 2) Get current user (incomplete)
    const meBefore = await request(app.getHttpServer())
      .get('/api/v1/user/me')
      .set('Authorization', `Bearer ${mockAccessToken}`)
      .expect(200);

    expect(meBefore.body).toMatchObject({
      id: mockUserId,
      email,
      is_profile_created: false,
      name: null,
      second_name: null,
      avatar_url: null,
    });

    // 3) Complete profile
    const updateDto = {
      name: 'Bob',
      second_name: 'Jones',
      // profile image optional; still valid
    };

    const updateRes = await request(app.getHttpServer())
      .patch('/api/v1/user/update')
      .set('Authorization', `Bearer ${mockAccessToken}`)
      .send(updateDto)
      .expect(200);

    expect(updateRes.body).toMatchObject({
      email,
      name: 'Bob',
      second_name: 'Jones',
      is_profile_created: true,
    });

    // 4) Get current user (completed)
    const meAfter = await request(app.getHttpServer())
      .get('/api/v1/user/me')
      .set('Authorization', `Bearer ${mockAccessToken}`)
      .expect(200);

    expect(meAfter.body).toMatchObject({
      id: mockUserId,
      email,
      name: 'Bob',
      second_name: 'Jones',
      is_profile_created: true,
    });
  });
});


