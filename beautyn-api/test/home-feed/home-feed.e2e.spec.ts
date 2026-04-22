import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/shared/database/prisma.service';
import { TransformInterceptor } from '../../src/shared/interceptors/transform.interceptor';
import { JwtAuthGuard } from '../../src/shared/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../src/shared/guards/optional-jwt-auth.guard';

describe('HomeFeed (e2e)', () => {
  let app: INestApplication;
  const userId = '123e4567-e89b-12d3-a456-426614174333';
  const adminUserId = '123e4567-e89b-12d3-a456-426614174444';

  const salons: any[] = [];
  const bookings: any[] = [];
  const savedSalons: any[] = [];
  const homeFeedSections: any[] = [];
  const appCategories: any[] = [];
  const categories: any[] = [];
  const salonCategoryMappings: any[] = [];

  const prismaMock: Partial<PrismaService> = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    salon: {
      findMany: jest.fn().mockImplementation(({ where, orderBy, take }: any) => {
        let filtered = salons.filter((s) => !s.deletedAt);

        if (where?.categories?.some?.mapping?.appCategoryId) {
          const catId = where.categories.some.mapping.appCategoryId;
          const mappedSalonCatIds = salonCategoryMappings
            .filter((m: any) => m.appCategoryId === catId)
            .map((m: any) => m.salonCategoryId);
          const salonIds = categories
            .filter((c: any) => mappedSalonCatIds.includes(c.id))
            .map((c: any) => c.salonId);
          filtered = filtered.filter((s: any) => salonIds.includes(s.id));
        }

        if (orderBy?.ratingAvg === 'desc') {
          filtered.sort((a: any, b: any) => (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0));
        }

        return filtered.slice(0, take || filtered.length);
      }),
      findUnique: jest.fn().mockImplementation(({ where }: any) => {
        return salons.find((s) => s.id === where?.id) || null;
      }),
    } as any,
    booking: {
      findFirst: jest.fn().mockImplementation(({ where, orderBy, include }: any) => {
        let filtered = bookings.filter((b: any) => b.userId === where.userId);
        if (where.datetime?.gte) {
          const gte = where.datetime.gte;
          filtered = filtered.filter((b: any) => b.datetime >= gte);
        }
        if (orderBy?.datetime === 'asc') {
          filtered.sort((a: any, b: any) => a.datetime.getTime() - b.datetime.getTime());
        }
        const booking = filtered[0] || null;
        if (booking && include?.salon) {
          const salon = salons.find((s) => s.id === booking.salonId);
          return {
            ...booking,
            salon: salon
              ? { name: salon.name, coverImageUrl: salon.coverImageUrl, addressLine: salon.addressLine }
              : null,
          };
        }
        return booking;
      }),
    } as any,
    homeFeedSection: {
      findMany: jest.fn().mockImplementation(({ where, orderBy }: any) => {
        let filtered = [...homeFeedSections];
        if (where?.isActive !== undefined) {
          filtered = filtered.filter((s: any) => s.isActive === where.isActive);
        }
        if (orderBy?.sortOrder === 'asc') {
          filtered.sort((a: any, b: any) => a.sortOrder - b.sortOrder);
        }
        return filtered;
      }),
      findUnique: jest.fn().mockImplementation(({ where }: any) => {
        return homeFeedSections.find((s: any) => s.id === where?.id) || null;
      }),
      create: jest.fn().mockImplementation(({ data }: any) => {
        const section = {
          id: randomUUID(),
          type: data.type,
          title: data.title,
          emoji: data.emoji ?? null,
          sortOrder: data.sortOrder,
          limit: data.limit ?? 10,
          isActive: data.isActive ?? true,
          filters: data.filters ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        homeFeedSections.push(section);
        return section;
      }),
      update: jest.fn().mockImplementation(({ where, data }: any) => {
        const idx = homeFeedSections.findIndex((s: any) => s.id === where.id);
        if (idx < 0) return null;
        const updated = { ...homeFeedSections[idx], ...data, updatedAt: new Date() };
        homeFeedSections[idx] = updated;
        return updated;
      }),
      delete: jest.fn().mockImplementation(({ where }: any) => {
        const idx = homeFeedSections.findIndex((s: any) => s.id === where.id);
        if (idx < 0) return null;
        const [removed] = homeFeedSections.splice(idx, 1);
        return removed;
      }),
    } as any,
    appCategory: {
      findMany: jest.fn().mockImplementation(({ where, skip, take }: any) => {
        let filtered = [...appCategories];
        if (where?.isActive !== undefined) {
          filtered = filtered.filter((c: any) => c.isActive === where.isActive);
        }
        filtered.sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        const s = skip || 0;
        const t = take || filtered.length;
        return filtered.slice(s, s + t);
      }),
      count: jest.fn().mockImplementation(({ where }: any) => {
        let filtered = [...appCategories];
        if (where?.isActive !== undefined) {
          filtered = filtered.filter((c: any) => c.isActive === where.isActive);
        }
        return filtered.length;
      }),
      findUnique: jest.fn().mockImplementation(({ where }: any) => {
        return appCategories.find((c: any) => c.id === where?.id) || null;
      }),
    } as any,
    savedSalon: {
      findMany: jest.fn().mockImplementation(({ where, include, skip, take, select }: any) => {
        let filtered = savedSalons.filter((ss: any) => ss.userId === where.userId);

        if (where.salonId?.in) {
          filtered = filtered.filter((ss: any) => where.salonId.in.includes(ss.salonId));
          if (select?.salonId) {
            return filtered.map((ss: any) => ({ salonId: ss.salonId }));
          }
          return filtered;
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
                ? { id: salon.id, name: salon.name, coverImageUrl: salon.coverImageUrl, addressLine: salon.addressLine, city: salon.city, ratingAvg: salon.ratingAvg, ratingCount: salon.ratingCount }
                : null,
            };
          });
        }
        return paged;
      }),
      count: jest.fn().mockImplementation(({ where }: any) => {
        return savedSalons.filter((ss: any) => ss.userId === where.userId).length;
      }),
    } as any,
    $queryRaw: jest.fn().mockImplementation(() => {
      return salons
        .filter((s: any) => !s.deletedAt)
        .map((s: any) => ({
          id: s.id,
          name: s.name,
          address_line: s.addressLine,
          city: s.city,
          latitude: s.latitude,
          longitude: s.longitude,
          cover_image_url: s.coverImageUrl,
          rating_avg: s.ratingAvg,
          rating_count: s.ratingCount,
          min_price_cents: null,
          max_price_cents: null,
          open_hours_json: null,
          distance_km: null,
          total_count: salons.filter((x: any) => !x.deletedAt).length,
        }));
    }),
  };

  beforeAll(async () => {
    const mockJwtGuard = {
      canActivate: jest.fn().mockImplementation((context) => {
        const req = context.switchToHttp().getRequest();
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Bearer ')) {
          throw new UnauthorizedException();
        }
        if (auth === 'Bearer admin-token') {
          req.user = { id: adminUserId, role: 'admin' };
        } else {
          req.user = { id: userId, role: 'client' };
        }
        return true;
      }),
    };

    const mockOptionalJwtGuard = {
      canActivate: jest.fn().mockImplementation((context) => {
        const req = context.switchToHttp().getRequest();
        const auth = req.headers.authorization;
        if (auth && auth.startsWith('Bearer ')) {
          req.user = { id: userId, role: 'client' };
        } else {
          req.user = null;
        }
        return true;
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue(mockOptionalJwtGuard)
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
    bookings.length = 0;
    savedSalons.length = 0;
    homeFeedSections.length = 0;
    appCategories.length = 0;
    categories.length = 0;
    salonCategoryMappings.length = 0;

    salons.push(
      {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Beauty Palace',
        coverImageUrl: 'https://img.test/palace.jpg',
        addressLine: '1 Main St',
        city: 'Kyiv',
        ratingAvg: 4.5,
        ratingCount: 100,
        latitude: 50.45,
        longitude: 30.52,
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
        latitude: 49.84,
        longitude: 24.03,
        deletedAt: null,
      },
    );

    appCategories.push({
      id: 'a0000000-0000-4000-8000-000000000010',
      slug: 'nails',
      name: 'Nails',
      keywords: [],
      imageUrl: 'https://img.test/nails.jpg',
      sortOrder: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  // ── Public Home Feed ──

  describe('GET /api/v1/home (unauthorized)', () => {
    it('returns categories and empty sections', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/home')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.categories).toBeDefined();
      expect(res.body.data.categories.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.categories[0].name).toBe('Nails');
      expect(res.body.data.categories[0].image_url).toBe('https://img.test/nails.jpg');
      expect(res.body.data.sections).toEqual([]);
      expect(res.body.data.next_booking).toBeUndefined();
      expect(res.body.data.saved_salons).toBeUndefined();
    });

    it('returns popular section when configured', async () => {
      homeFeedSections.push({
        id: randomUUID(),
        type: 'popular',
        title: 'Popular Salons',
        emoji: '🔥',

        sortOrder: 0,
        limit: 10,
        isActive: true,
        filters: null,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/home')
        .expect(200);

      expect(res.body.data.sections).toHaveLength(1);
      expect(res.body.data.sections[0].type).toBe('popular');
      expect(res.body.data.sections[0].title).toBe('Popular Salons');
      expect(res.body.data.sections[0].items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.sections[0].items[0]).toHaveProperty('id');
      expect(res.body.data.sections[0].items[0]).toHaveProperty('name');
      expect(res.body.data.sections[0].items[0]).toHaveProperty('rating_avg');
    });

    it('only includes active sections', async () => {
      homeFeedSections.push(
        { id: randomUUID(), type: 'popular', title: 'Active', emoji: null, appCategoryId: null, sortOrder: 0, limit: 10, isActive: true, filters: null },
        { id: randomUUID(), type: 'popular', title: 'Inactive', emoji: null, appCategoryId: null, sortOrder: 1, limit: 10, isActive: false, filters: null },
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/home')
        .expect(200);

      expect(res.body.data.sections).toHaveLength(1);
      expect(res.body.data.sections[0].title).toBe('Active');
    });
  });

  describe('GET /api/v1/home (authorized)', () => {
    it('returns nextBooking and savedSalons instead of categories', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      bookings.push({
        id: randomUUID(),
        salonId: salons[0].id,
        userId,
        datetime: futureDate,
        endDatetime: new Date(futureDate.getTime() + 3600000),
        status: 'created',
      });
      savedSalons.push({
        id: randomUUID(),
        userId,
        salonId: salons[1].id,
        createdAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/home')
        .set('Authorization', 'Bearer valid')
        .expect(200);

      expect(res.body.data.next_booking).toBeDefined();
      expect(res.body.data.next_booking.salon_name).toBe('Beauty Palace');
      expect(res.body.data.next_booking.booking_id).toBeDefined();
      expect(res.body.data.saved_salons).toBeDefined();
      expect(res.body.data.categories).toBeDefined();
    });

    it('returns null nextBooking when no future bookings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/home')
        .set('Authorization', 'Bearer valid')
        .expect(200);

      expect(res.body.data.next_booking).toBeNull();
      expect(res.body.data.saved_salons).toEqual([]);
    });

    it('marks isSaved on section salon cards', async () => {
      homeFeedSections.push({
        id: randomUUID(),
        type: 'popular',
        title: 'Popular',
        emoji: null,

        sortOrder: 0,
        limit: 10,
        isActive: true,
        filters: null,
      });

      savedSalons.push({
        id: randomUUID(),
        userId,
        salonId: salons[0].id,
        createdAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/home')
        .set('Authorization', 'Bearer valid')
        .expect(200);

      const items = res.body.data.sections[0].items;
      const saved = items.find((i: any) => i.id === salons[0].id);
      const notSaved = items.find((i: any) => i.id === salons[1].id);
      expect(saved?.is_saved).toBe(true);
      expect(notSaved?.is_saved).toBe(false);
    });
  });

  describe('GET /api/v1/home validation', () => {
    it('rejects invalid lat', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/home?lat=999')
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('rejects invalid lon', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/home?lon=999')
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('accepts valid lat/lon', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/home?lat=50.45&lon=30.52')
        .expect(200);
    });
  });

  // ── Admin Home Feed Sections ──

  describe('Admin CRUD /api/v1/admin/home-feed-sections', () => {
    it('requires authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/home-feed-sections')
        .expect(401);
    });

    it('GET lists all sections', async () => {
      homeFeedSections.push({
        id: randomUUID(),
        type: 'popular',
        title: 'All Popular',
        emoji: null,

        sortOrder: 0,
        limit: 10,
        isActive: true,
        filters: null,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/home-feed-sections')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('POST creates a section', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/home-feed-sections')
        .set('Authorization', 'Bearer admin-token')
        .send({ type: 'popular', title: 'New Popular', sortOrder: 0 })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('popular');
      expect(res.body.data.title).toBe('New Popular');
      expect(res.body.data.id).toBeDefined();
      expect(homeFeedSections).toHaveLength(1);
    });

    it('POST validates filters.appCategoryId exists', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/home-feed-sections')
        .set('Authorization', 'Bearer admin-token')
        .send({ type: 'category', title: 'Cat Section', sortOrder: 0, filters: { appCategoryId: '00000000-0000-0000-0000-999999999999' } })
        .expect(400);
    });

    it('POST creates category section with valid filters.appCategoryId', async () => {
      const catId = appCategories[0].id;

      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/home-feed-sections')
        .set('Authorization', 'Bearer admin-token')
        .send({ type: 'category', title: 'Nails Section', sortOrder: 1, filters: { appCategoryId: catId } })
        .expect(201);

      expect(res.body.data.type).toBe('category');
      expect(res.body.data.filters.appCategoryId).toBe(catId);
    });

    it('POST validates required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/home-feed-sections')
        .set('Authorization', 'Bearer admin-token')
        .send({})
        .expect(400);
    });

    it('PATCH updates a section', async () => {
      homeFeedSections.push({
        id: '00000000-0000-0000-0000-000000000099',
        type: 'popular',
        title: 'Old Title',
        emoji: null,

        sortOrder: 0,
        limit: 10,
        isActive: true,
        filters: null,
      });

      const res = await request(app.getHttpServer())
        .patch('/api/v1/admin/home-feed-sections/00000000-0000-0000-0000-000000000099')
        .set('Authorization', 'Bearer admin-token')
        .send({ title: 'New Title' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('New Title');
    });

    it('PATCH returns 404 for nonexistent section', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/admin/home-feed-sections/00000000-0000-0000-0000-999999999999')
        .set('Authorization', 'Bearer admin-token')
        .send({ title: 'X' })
        .expect(404);
    });

    it('PATCH rejects invalid UUID', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/admin/home-feed-sections/not-a-uuid')
        .set('Authorization', 'Bearer admin-token')
        .send({ title: 'X' })
        .expect(400);
    });

    it('DELETE removes a section', async () => {
      const sectionId = '00000000-0000-0000-0000-000000000098';
      homeFeedSections.push({
        id: sectionId,
        type: 'popular',
        title: 'To Delete',
        emoji: null,

        sortOrder: 0,
        limit: 10,
        isActive: true,
        filters: null,
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/home-feed-sections/${sectionId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(204);

      expect(homeFeedSections.find((s: any) => s.id === sectionId)).toBeUndefined();
    });

    it('DELETE returns 404 for nonexistent section', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/admin/home-feed-sections/00000000-0000-0000-0000-999999999999')
        .set('Authorization', 'Bearer admin-token')
        .expect(404);
    });
  });
});
