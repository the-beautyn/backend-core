import request from 'supertest';
import { buildPublicApp, buildInternalApp, withInternalKey } from '../utils/test-app.services';
import { INestApplication } from '@nestjs/common';

describe('Services e2e', () => {
  describe('public routes', () => {
    let app: INestApplication;
    const service = {
      list: jest.fn(),
      listCategories: jest.fn(),
    } as any;

    beforeAll(async () => {
      app = await buildPublicApp(service);
    });

    afterAll(async () => {
      await app.close();
    });

    it('GET /api/v1/services', async () => {
      service.list.mockResolvedValue({
        items: [
          {
            id: '1',
            salon_id: 's1',
            crm_external_id: null,
            category_id: null,
            name: 'Cut',
            description: null,
            duration_minutes: 30,
            price_cents: 1000,
            currency: 'USD',
            is_active: true,
          },
        ],
        page: 1,
        limit: 50,
        total: 1,
      });

      const res = await request(app.getHttpServer()).get('/api/v1/services?salon_id=s1');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        items: [
          {
            id: '1',
            salon_id: 's1',
            crm_external_id: null,
            category_id: null,
            name: 'Cut',
            description: null,
            duration_minutes: 30,
            price_cents: 1000,
            currency: 'USD',
            is_active: true,
          },
        ],
        page: 1,
        limit: 50,
        total: 1,
      });
    });

    it('GET /api/v1/categories', async () => {
      service.listCategories.mockResolvedValue([
        {
          id: '1',
          salon_id: 's1',
          crm_external_id: null,
          name: 'Cut',
          color: null,
          sort_order: null,
          created_at: '2020-01-01T00:00:00.000Z',
          updated_at: '2020-01-01T00:00:00.000Z',
        },
      ]);

      const res = await request(app.getHttpServer()).get('/api/v1/categories?salon_id=s1');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        {
          id: '1',
          salon_id: 's1',
          crm_external_id: null,
          name: 'Cut',
          color: null,
          sort_order: null,
          created_at: '2020-01-01T00:00:00.000Z',
          updated_at: '2020-01-01T00:00:00.000Z',
        },
      ]);
    });
  });

  describe('internal routes', () => {
    let app: INestApplication;
    const service = {
      syncFromCrm: jest.fn(),
    } as any;

    beforeAll(async () => {
      app = await buildInternalApp(service);
    });

    afterAll(async () => {
      await app.close();
    });

    it('POST /api/v1/internal/services/sync requires key', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/internal/services/sync')
        .send({ salon_id: 's1', services: [] })
        .expect(401);
    });

    it('POST /api/v1/internal/services/sync with key', async () => {
      service.syncFromCrm.mockResolvedValue({
        upserted: 1,
        deleted: 0,
        categories_upserted: 1,
      });

      await withInternalKey(
        request(app.getHttpServer())
          .post('/api/v1/internal/services/sync')
          .send({ salon_id: 's1', services: [] }),
      )
        .expect(200)
        .expect({ upserted: 1, deleted: 0, categories_upserted: 1 });
    });
  });
});
