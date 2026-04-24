import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../src/shared/guards/jwt-auth.guard';
import { PrismaService } from '../src/shared/database/prisma.service';
import { SharedModule } from '../src/shared/shared.module';
import { SupabaseModule } from '../src/shared/supabase/supabase.module';
import { StorageModule } from '../src/shared/storage/storage.module';
import { AppThrottlerModule } from '../src/shared/throttler/app-throttler.module';
import { PublicApiModule } from '../src/api-gateway/public-api.module';
import { AuthenticatedApiModule } from '../src/api-gateway/authenticated-api.module';

describe('User Settings - role-specific (e2e)', () => {
  let app: INestApplication;
  let mockUserId: string;
  let mockUserRole: UserRole;
  const mockAccessToken = 'mock-access-token';

  const memUsers = new Map<string, any>();
  const memClientSettings = new Map<string, any>();
  const memOwnerSettings = new Map<string, any>();

  const seedUser = (id: string, role: UserRole) => {
    memUsers.set(id, {
      id,
      email: `${id}@example.com`,
      role,
      name: null,
      secondName: null,
      phone: null,
      avatarUrl: null,
      authProvider: 'email',
      isPhoneVerified: false,
      isProfileCreated: false,
      isOnboardingCompleted: false,
      subscriptionId: null,
      crmId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  beforeAll(async () => {
    const mockJwtGuard = {
      canActivate: jest.fn().mockImplementation((context) => {
        const req = context.switchToHttp().getRequest();
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          req.user = { id: mockUserId, role: mockUserRole };
          return true;
        }
        return false;
      }),
    };

    const prismaMock: Partial<PrismaService> = {
      users: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where?.id) return memUsers.get(where.id) ?? null;
          return null;
        }),
      } as any,
      clientSettings: {
        findUnique: jest.fn().mockImplementation(({ where }: any) =>
          memClientSettings.get(where.userId) ?? null,
        ),
        upsert: jest.fn().mockImplementation(({ where, update, create }: any) => {
          const existing = memClientSettings.get(where.userId);
          if (existing) {
            const merged = { ...existing, ...update, updatedAt: new Date() };
            memClientSettings.set(where.userId, merged);
            return merged;
          }
          const fresh = {
            userId: where.userId,
            pushNotificationsEnabled: true,
            emailNotificationsEnabled: true,
            smsNotificationsEnabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...create,
          };
          memClientSettings.set(where.userId, fresh);
          return fresh;
        }),
      } as any,
      ownerSettings: {
        findUnique: jest.fn().mockImplementation(({ where }: any) =>
          memOwnerSettings.get(where.userId) ?? null,
        ),
        upsert: jest.fn().mockImplementation(({ where, update, create }: any) => {
          const existing = memOwnerSettings.get(where.userId);
          if (existing) {
            const merged = { ...existing, ...update, updatedAt: new Date() };
            memOwnerSettings.set(where.userId, merged);
            return merged;
          }
          const fresh = {
            userId: where.userId,
            inAppNotificationsEnabled: true,
            emailNotificationsEnabled: true,
            smsNotificationsEnabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...create,
          };
          memOwnerSettings.set(where.userId, fresh);
          return fresh;
        }),
      } as any,
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        SharedModule,
        SupabaseModule,
        StorageModule,
        AppThrottlerModule,
        PublicApiModule,
        AuthenticatedApiModule,
      ],
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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    memUsers.clear();
    memClientSettings.clear();
    memOwnerSettings.clear();
    mockUserId = randomUUID();
  });

  describe('client role', () => {
    beforeEach(() => {
      mockUserRole = UserRole.client;
      seedUser(mockUserId, UserRole.client);
    });

    it('GET /user/settings returns client-shaped notifications (self-heals)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/user/settings')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .expect(200);

      expect(res.body).toEqual({
        notifications: { push_enabled: true, email_enabled: true, sms_enabled: true },
      });
      expect(memClientSettings.get(mockUserId)).toBeDefined();
    });

    it('PATCH /user/settings/notifications updates only supplied client fields', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/user/settings/notifications')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .send({ push_enabled: false })
        .expect(200);

      expect(res.body).toEqual({
        notifications: { push_enabled: false, email_enabled: true, sms_enabled: true },
      });
    });

    it('PATCH rejects in_app_enabled (owner-only) for a client with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/user/settings/notifications')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .send({ in_app_enabled: false })
        .expect(400);
    });

    it('GET /user/me?include=settings embeds the client settings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/user/me?include=settings')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: mockUserId,
        settings: {
          notifications: { push_enabled: true, email_enabled: true, sms_enabled: true },
        },
      });
    });

    it('GET /user/me without include does NOT expand settings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/user/me')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .expect(200);

      expect(res.body.settings).toBeUndefined();
    });
  });

  describe('owner role', () => {
    beforeEach(() => {
      mockUserRole = UserRole.owner;
      seedUser(mockUserId, UserRole.owner);
    });

    it('GET /user/settings returns owner-shaped notifications', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/user/settings')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .expect(200);

      expect(res.body).toEqual({
        notifications: { in_app_enabled: true, email_enabled: true, sms_enabled: true },
      });
      expect(memOwnerSettings.get(mockUserId)).toBeDefined();
      expect(memClientSettings.get(mockUserId)).toBeUndefined();
    });

    it('PATCH updates in_app_enabled on owner', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/user/settings/notifications')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .send({ in_app_enabled: false })
        .expect(200);

      expect(res.body).toEqual({
        notifications: { in_app_enabled: false, email_enabled: true, sms_enabled: true },
      });
    });

    it('PATCH rejects push_enabled (client-only) for an owner with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/user/settings/notifications')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .send({ push_enabled: false })
        .expect(400);
    });

    it('GET /user/me?include=settings embeds the owner settings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/user/me?include=settings')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .expect(200);

      expect(res.body.settings).toEqual({
        notifications: { in_app_enabled: true, email_enabled: true, sms_enabled: true },
      });
    });
  });

  describe('admin role', () => {
    beforeEach(() => {
      mockUserRole = UserRole.admin;
      seedUser(mockUserId, UserRole.admin);
    });

    it('GET /user/settings is 403 for admin', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/user/settings')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .expect(403);
    });

    it('GET /user/me?include=settings returns settings: null for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/user/me?include=settings')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .expect(200);

      expect(res.body.settings).toBeNull();
    });
  });
});
