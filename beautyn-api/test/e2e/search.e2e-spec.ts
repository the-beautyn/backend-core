import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { SearchService } from '../../src/search/search.service';
import { SearchSuggestionsService } from '../../src/search/search-suggestions.service';
import { SearchHistoryService } from '../../src/search/search-history.service';
import { SearchQueryBuilderService } from '../../src/search/search-query-builder.service';
import { GeoLocationService } from '../../src/search/geo-location.service';
import { JwtAuthGuard } from '../../src/shared/guards/jwt-auth.guard';
import { TransformInterceptor } from '../../src/shared/interceptors/transform.interceptor';
import { SearchPublicController } from '../../src/api-gateway/v1/public/search.public.controller';
import { SearchAuthenticatedController } from '../../src/api-gateway/v1/authenticated/search.authenticated.controller';

describe('Search API (e2e)', () => {
  let app: INestApplication;

  const searchRow = {
    id: 'salon-1',
    name: 'Salon One',
    address_line: 'Main 1',
    city: 'Kyiv',
    cover_image_url: 'logo.png',
    rating_avg: 4.5,
    rating_count: 20,
    distance_km: 1.2,
  };

  const historyItems = [
    {
      id: 'hist-1',
      salonId: 'salon-1',
      salonName: 'Salon One',
      city: 'Kyiv',
      logoUrl: 'logo.png',
      lastSearchedAt: new Date().toISOString(),
    },
  ];

  const mockGeo: Partial<GeoLocationService> = {
    resolveGeoContext: jest.fn().mockReturnValue({ mode: 'none' }),
    getMinResults: jest.fn().mockReturnValue(5),
    getMaxRadius: jest.fn().mockReturnValue(15),
    getBaseRadius: jest.fn().mockImplementation((type?: any) => {
      if (type === 'address') return 2;
      if (type === 'city') return 7;
      return 3;
    }),
    expandRadius: jest.fn().mockImplementation((r: number) => Math.min(r * 2, 15)),
  };

  const mockQueryBuilder: Partial<SearchQueryBuilderService> = {
    runSearch: jest.fn().mockResolvedValue({ items: [searchRow], total: 1 }),
    findSuggestions: jest.fn().mockResolvedValue([
      {
        id: 'salon-2',
        name: 'Salon Two',
        city: 'Odesa',
        cover_image_url: 'logo-2.png',
        rating_avg: 4.2,
        rating_count: 12,
      },
    ]),
  };

  const mockHistory: Partial<SearchHistoryService> = {
    getHistory: jest.fn().mockResolvedValue(historyItems),
    clearHistory: jest.fn().mockResolvedValue(undefined),
    deleteHistoryItem: jest.fn().mockResolvedValue(undefined),
    addVisit: jest.fn().mockResolvedValue(undefined),
  };

  const mockJwtGuard = {
    canActivate: jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Bearer ')) {
        throw new UnauthorizedException();
      }
      req.user = { id: 'user-1' };
      return true;
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SearchPublicController, SearchAuthenticatedController],
      providers: [
        SearchService,
        SearchSuggestionsService,
        { provide: SearchQueryBuilderService, useValue: mockQueryBuilder },
        { provide: GeoLocationService, useValue: mockGeo },
        { provide: SearchHistoryService, useValue: mockHistory },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
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
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (mockGeo.resolveGeoContext as jest.Mock).mockReturnValue({ mode: 'none' });
    (mockQueryBuilder.runSearch as jest.Mock).mockResolvedValue({ items: [searchRow], total: 1 });
  });

  it('POST /api/v1/search returns mapped search results', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/search')
      .send({ query: 'cuts' })
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      data: {
        items: [
          {
            salonId: 'salon-1',
            name: 'Salon One',
            address: 'Kyiv, Main 1',
            rating: 4.5,
            distanceKm: 1.2,
            logoUrl: 'logo.png',
            imageUrl: 'logo.png',
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
        meta: { geoSource: 'none' },
      },
    });
    expect(mockQueryBuilder.runSearch).toHaveBeenCalledTimes(1);
    expect(mockQueryBuilder.runSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        dto: expect.objectContaining({ query: 'cuts' }),
        page: 1,
        limit: 20,
      }),
    );
  });

  it('applies center geo and includes meta', async () => {
    (mockGeo.resolveGeoContext as jest.Mock).mockReturnValue({
      mode: 'center',
      centerLat: 50.45,
      centerLng: 30.52,
      locationType: 'address',
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/search')
      .send({ centerLat: 50.45, centerLng: 30.52, locationType: 'address' })
      .expect(200);

    expect(res.body.data.meta).toMatchObject({ geoSource: 'center', effectiveRadiusKm: 15 });
    expect(mockQueryBuilder.runSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        geoContext: expect.objectContaining({ mode: 'center' }),
        radiusKm: 15,
      }),
    );
  });

  it('expands radius when results below threshold', async () => {
    (mockGeo.resolveGeoContext as jest.Mock).mockReturnValue({
      mode: 'center',
      centerLat: 50.45,
      centerLng: 30.52,
      locationType: 'city',
    });

    (mockQueryBuilder.runSearch as jest.Mock)
      .mockResolvedValueOnce({ items: [], total: 2 })
      .mockResolvedValueOnce({ items: [searchRow], total: 12 });

    const res = await request(app.getHttpServer())
      .post('/api/v1/search')
      .send({ centerLat: 50.45, centerLng: 30.52, locationType: 'city' })
      .expect(200);

    expect(mockQueryBuilder.runSearch).toHaveBeenCalledTimes(2);
    expect((mockQueryBuilder.runSearch as jest.Mock).mock.calls[0][0].radiusKm).toBe(7);
    expect((mockQueryBuilder.runSearch as jest.Mock).mock.calls[1][0].radiusKm).toBe(14);
    expect(res.body.data.meta.effectiveRadiusKm).toBe(14);
  });

  it('passes price and category filters through to query builder', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/search')
      .send({ priceMin: 100, priceMax: 300, appCategoryIds: ['abc', 'def'] })
      .expect(200);

    expect(mockQueryBuilder.runSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        dto: expect.objectContaining({
          priceMin: 100,
          priceMax: 300,
          appCategoryIds: ['abc', 'def'],
        }),
      }),
    );
  });

  it('uses viewport geo when provided', async () => {
    (mockGeo.resolveGeoContext as jest.Mock).mockReturnValue({
      mode: 'viewport',
      viewport: { neLat: 50.5, neLng: 30.6, swLat: 50.4, swLng: 30.5 },
      centerLat: 50.45,
      centerLng: 30.55,
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/search')
      .send({ viewport: { neLat: 50.5, neLng: 30.6, swLat: 50.4, swLng: 30.5 } })
      .expect(200);

    expect(mockQueryBuilder.runSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        geoContext: expect.objectContaining({ mode: 'viewport' }),
      }),
    );
    expect(res.body.data.meta.geoSource).toBe('viewport');
  });

  it('GET /api/v1/search/suggestions merges history and name matches', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/search/suggestions?query=sal')
      .set('Authorization', 'Bearer token')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([
      {
        id: 'salon-1',
        type: 'history',
        label: 'Salon One',
        subtitle: 'Kyiv',
        logoUrl: 'logo.png',
      },
      {
        id: 'salon-2',
        type: 'salon',
        label: 'Salon Two',
        subtitle: 'Odesa · 4.2 ★ · 12',
        logoUrl: 'logo-2.png',
      },
    ]);
    expect(mockHistory.getHistory).toHaveBeenCalled();
    expect(mockQueryBuilder.findSuggestions).toHaveBeenCalledWith('sal', expect.any(Number));
  });

  it('GET /api/v1/search/history requires auth and returns history', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/search/history')
      .set('Authorization', 'Bearer token')
      .expect(200);

    expect(res.body).toEqual({ success: true, data: historyItems });
    expect(mockHistory.getHistory).toHaveBeenCalledWith('user-1', expect.any(Number));
  });

  it('DELETE /api/v1/search/history/:id deletes item', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/search/history/hist-1')
      .set('Authorization', 'Bearer token')
      .expect(204);

    expect(mockHistory.deleteHistoryItem).toHaveBeenCalledWith('user-1', 'hist-1');
  });
});
