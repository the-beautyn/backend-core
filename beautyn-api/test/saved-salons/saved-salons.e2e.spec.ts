import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/shared/database/prisma.service';
import { TransformInterceptor } from '../../src/shared/interceptors/transform.interceptor';
import { JwtAuthGuard } from '../../src/shared/guards/jwt-auth.guard';

describe('SavedSalons (e2e)', () => {
  let app: INestApplication;
  const userId = '123e4567-e89b-12d3-a456-426614174222';

  const salons: any[] = [];
  const savedSalons: any[] = [];

  const prismaMock: Partial<PrismaService> = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    salon: {
      findFirst: jest.fn().mockImplementation(({ where }: any) => {
        const salon = salons.find((s) => s.id === where?.id);
        if (!salon) return null;
        if (where?.deletedAt === null && salon.deletedAt != null) return null;
        return salon;
      }),
      findUnique: jest.fn().mockImplementation(({ where }: any) => {
        return salons.find((s) => s.id === where?.id) || null;
      }),
    } as any,
    savedSalon: {
      upsert: jest.fn().mockImplementation(({ where, create }: any) => {
        const existing = savedSalons.find(
          (ss) => ss.userId === where.userId_salonId.userId && ss.salonId === where.userId_salonId.salonId,
        );
        if (existing) return existing;
        const row = { id: randomUUID(), ...create, createdAt: new Date() };
        savedSalons.push(row);
        return row;
      }),
      deleteMany: jest.fn().mockImplementation(({ where }: any) => {
        const idx = savedSalons.findIndex((ss) => ss.userId === where.userId && ss.salonId === where.salonId);
        if (idx >= 0) savedSalons.splice(idx, 1);
        return { count: idx >= 0 ? 1 : 0 };
      }),
      findMany: jest.fn().mockImplementation(({ where, include, orderBy, skip, take, select }: any) => {
        let filtered = savedSalons.filter((ss) => ss.userId === where.userId);

        if (where.salonId?.in) {
          filtered = filtered.filter((ss) => where.salonId.in.includes(ss.salonId));
          if (select?.salonId) {
            return filtered.map((ss) => ({ salonId: ss.salonId }));
          }
          return filtered;
        }

        if (where.salon?.name) {
          const nameFilter = where.salon.name.contains.toLowerCase();
          filtered = filtered.filter((ss) => {
            const salon = salons.find((s) => s.id === ss.salonId);
            return salon?.name?.toLowerCase().includes(nameFilter);
          });
        }

        filtered.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());

        const s = skip || 0;
        const t = take || filtered.length;
        const paged = filtered.slice(s, s + t);

        if (include?.salon) {
          return paged.map((ss: any) => {
            const salon = salons.find((s) => s.id === ss.salonId);
            return {
              ...ss,
              salon: salon
                ? {
                    id: salon.id,
                    name: salon.name,
                    coverImageUrl: salon.coverImageUrl,
                    addressLine: salon.addressLine,
                    city: salon.city,
                    ratingAvg: salon.ratingAvg,
                    ratingCount: salon.ratingCount,
                  }
                : null,
            };
          });
        }

        return paged;
      }),
      count: jest.fn().mockImplementation(({ where }: any) => {
        let filtered = savedSalons.filter((ss) => ss.userId === where.userId);
        if (where.salon?.name) {
          const nameFilter = where.salon.name.contains.toLowerCase();
          filtered = filtered.filter((ss) => {
            const salon = salons.find((s) => s.id === ss.salonId);
            return salon?.name?.toLowerCase().includes(nameFilter);
          });
        }
        return filtered.length;
      }),
      findUnique: jest.fn().mockImplementation(({ where }: any) => {
        return (
          savedSalons.find(
            (ss) => ss.userId === where.userId_salonId.userId && ss.salonId === where.userId_salonId.salonId,
          ) || null
        );
      }),
    } as any,
  };

  beforeAll(async () => {
    const mockJwtGuard = {
      canActivate: jest.fn().mockImplementation((context) => {
        const req = context.switchToHttp().getRequest();
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Bearer ')) {
          throw new UnauthorizedException();
        }
        req.user = { id: userId, role: 'client' };
        return true;
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    const ti = app.get(TransformInterceptor);
    app.useGlobalInterceptors(ti);
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
    salons.length = 0;
    savedSalons.length = 0;

    salons.push(
      {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Beauty Palace',
        coverImageUrl: 'https://img.test/palace.jpg',
        addressLine: '1 Main St',
        city: 'Kyiv',
        ratingAvg: 4.5,
        ratingCount: 100,
        deletedAt: null,
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Glamour Studio',
        coverImageUrl: 'https://img.test/glamour.jpg',
        addressLine: '2 Oak Ave',
        city: 'Lviv',
        ratingAvg: 3.8,
        ratingCount: 50,
        deletedAt: null,
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        name: 'Zen Spa',
        coverImageUrl: null,
        addressLine: null,
        city: null,
        ratingAvg: null,
        ratingCount: null,
        deletedAt: null,
      },
    );
  });

  it('POST /api/v1/saved-salons/:salonId without JWT returns 401', () => {
    return request(app.getHttpServer())
      .post('/api/v1/saved-salons/00000000-0000-0000-0000-000000000001')
      .expect(401);
  });

  it('POST /api/v1/saved-salons/:salonId with invalid UUID returns 400', () => {
    return request(app.getHttpServer())
      .post('/api/v1/saved-salons/not-a-uuid')
      .set('Authorization', 'Bearer valid')
      .expect(400);
  });

  it('POST /api/v1/saved-salons/:salonId with non-existent salon returns 404', () => {
    return request(app.getHttpServer())
      .post('/api/v1/saved-salons/99999999-9999-9999-9999-999999999999')
      .set('Authorization', 'Bearer valid')
      .expect(404);
  });

  it('saves and unsaves a salon', async () => {
    const salonId = '00000000-0000-0000-0000-000000000001';

    const saveRes = await request(app.getHttpServer())
      .post(`/api/v1/saved-salons/${salonId}`)
      .set('Authorization', 'Bearer valid')
      .expect(200);

    expect(saveRes.body.success).toBe(true);
    expect(saveRes.body.data.saved).toBe(true);
    expect(savedSalons).toHaveLength(1);

    const unsaveRes = await request(app.getHttpServer())
      .delete(`/api/v1/saved-salons/${salonId}`)
      .set('Authorization', 'Bearer valid')
      .expect(200);

    expect(unsaveRes.body.success).toBe(true);
    expect(unsaveRes.body.data.saved).toBe(false);
    expect(savedSalons).toHaveLength(0);
  });

  it('saving same salon twice is idempotent', async () => {
    const salonId = '00000000-0000-0000-0000-000000000001';

    await request(app.getHttpServer())
      .post(`/api/v1/saved-salons/${salonId}`)
      .set('Authorization', 'Bearer valid')
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/saved-salons/${salonId}`)
      .set('Authorization', 'Bearer valid')
      .expect(200);

    expect(savedSalons).toHaveLength(1);
  });

  it('unsaving a non-saved salon does not error', async () => {
    const res = await request(app.getHttpServer())
      .delete('/api/v1/saved-salons/00000000-0000-0000-0000-000000000001')
      .set('Authorization', 'Bearer valid')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.saved).toBe(false);
  });

  it('GET /api/v1/saved-salons returns paginated list', async () => {
    savedSalons.push(
      { id: randomUUID(), userId, salonId: salons[0].id, createdAt: new Date('2026-03-01') },
      { id: randomUUID(), userId, salonId: salons[1].id, createdAt: new Date('2026-03-02') },
    );

    const res = await request(app.getHttpServer())
      .get('/api/v1/saved-salons')
      .set('Authorization', 'Bearer valid')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBe(20);
    expect(res.body.data.total).toBe(2);

    const first = res.body.data.items[0];
    expect(first.salon_id).toBe(salons[1].id);
    expect(first.salon_name).toBe('Glamour Studio');
    expect(first.city).toBe('Lviv');
    expect(first).toHaveProperty('saved_at');
  });

  it('GET /api/v1/saved-salons with search filter', async () => {
    savedSalons.push(
      { id: randomUUID(), userId, salonId: salons[0].id, createdAt: new Date('2026-03-01') },
      { id: randomUUID(), userId, salonId: salons[1].id, createdAt: new Date('2026-03-02') },
    );

    const res = await request(app.getHttpServer())
      .get('/api/v1/saved-salons?q=beauty')
      .set('Authorization', 'Bearer valid')
      .expect(200);

    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].salon_name).toBe('Beauty Palace');
    expect(res.body.data.total).toBe(1);
  });

  it('GET /api/v1/saved-salons with pagination params', async () => {
    savedSalons.push(
      { id: randomUUID(), userId, salonId: salons[0].id, createdAt: new Date('2026-03-01') },
      { id: randomUUID(), userId, salonId: salons[1].id, createdAt: new Date('2026-03-02') },
      { id: randomUUID(), userId, salonId: salons[2].id, createdAt: new Date('2026-03-03') },
    );

    const res = await request(app.getHttpServer())
      .get('/api/v1/saved-salons?page=2&limit=1')
      .set('Authorization', 'Bearer valid')
      .expect(200);

    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.page).toBe(2);
    expect(res.body.data.limit).toBe(1);
    expect(res.body.data.total).toBe(3);
  });

  it('GET /api/v1/saved-salons returns empty list when none saved', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/saved-salons')
      .set('Authorization', 'Bearer valid')
      .expect(200);

    expect(res.body.data.items).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });

  it('GET /api/v1/saved-salons without JWT returns 401', () => {
    return request(app.getHttpServer())
      .get('/api/v1/saved-salons')
      .expect(401);
  });
});
