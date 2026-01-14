import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  buildPublicApp,
  buildInternalApp,
  withInternalKey,
} from '../utils/test-app.salon';
import { SalonsController } from '../../../src/api-gateway/v1/public/salons.controller';
import { SalonsInternalController } from '../../../src/api-gateway/v1/internal/salons.internal.controller';
import { PrismaService } from '../../../src/shared/database/prisma.service';
import { CrmSalonDiffService } from '../../../src/crm-salon-changes/crm-salon-diff.service';
import { SalonService } from '../../../src/salon/salon.service';
import { SearchHistoryService } from '../../../src/search/search-history.service';

describe('Salon controllers', () => {
  describe('Public', () => {
    let app: INestApplication;
    const service = {
      list: jest.fn(),
      findById: jest.fn(),
      listImages: jest.fn(),
    } as unknown as SalonService;

    beforeAll(async () => {
      app = await buildPublicApp([SalonsController], [
        { provide: SalonService, useValue: service },
        { provide: SearchHistoryService, useValue: { addVisit: jest.fn() } },
      ]);
    });

    afterAll(async () => {
      await app.close();
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('GET /api/v1/salons returns list', async () => {
      const payload = { items: [], page: 1, limit: 20, total: 0 };
      (service.list as any).mockResolvedValue(payload);
      const res = await request(app.getHttpServer()).get('/api/v1/salons').expect(200);
      expect(res.body).toEqual(payload);
    });

    it('GET /api/v1/salons/:id returns salon when found', async () => {
      const salon = { id: '1', name: 'Salon 1' };
      (service.findById as any).mockResolvedValue(salon);
      const res = await request(app.getHttpServer())
        .get('/api/v1/salons/1?include=services,images')
        .expect(200);
      expect(res.body).toEqual(salon);
      expect(service.findById).toHaveBeenCalledWith('1', {
        services: true,
        workers: false,
        categories: false,
        images: true,
      });
    });

    it('GET /api/v1/salons/:id returns 404 when not found', async () => {
      (service.findById as any).mockResolvedValue(null);
      await request(app.getHttpServer())
        .get('/api/v1/salons/123')
        .expect(404);
    });
  });

  describe('Internal', () => {
    let app: INestApplication;
    const salonService = {
      replaceImages: jest.fn().mockResolvedValue({ count: 0 }),
      pullSalon: jest.fn().mockResolvedValue([]),
    } as unknown as any;

    beforeAll(async () => {
      app = await buildInternalApp([SalonsInternalController], [
        { provide: SalonService, useValue: salonService },
      ]);
    });

    afterAll(async () => {
      await app.close();
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('POST /api/v1/internal/salons/pull requires internal key', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/internal/salons/pull')
        .send({ salon_id: '00000000-0000-4000-8000-000000000001' })
        .expect(401);
    });

    it('POST /api/v1/internal/salons/pull returns changes', async () => {
      const payload = [{ id: 'change-1' }];
      salonService.pullSalon.mockResolvedValueOnce(payload);
      const res = await withInternalKey(
        request(app.getHttpServer()).post('/api/v1/internal/salons/pull'),
      )
        .send({ salon_id: '00000000-0000-4000-8000-000000000001' })
        .expect(200);
      expect(res.body).toEqual(payload);
      expect(salonService.pullSalon).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001');
    });
  });
});
