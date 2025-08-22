import { INestApplication, NotFoundException } from '@nestjs/common';
import request from 'supertest';
import {
  buildPublicApp,
  buildInternalApp,
  withInternalKey,
} from '../utils/test-app.workers';
import { WorkersService } from '../../../src/workers/workers.service';

describe('Workers e2e', () => {
  describe('public routes', () => {
    let app: INestApplication;
    const service: Partial<WorkersService> = {
      list: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'w1',
            salon_id: 'salon1',
            first_name: 'John',
            last_name: 'Doe',
            is_active: true,
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
      }),
      getById: jest.fn().mockImplementation((id: string) => {
        if (id === 'w1') {
          return {
            id: 'w1',
            salon_id: 'salon1',
            first_name: 'John',
            last_name: 'Doe',
            is_active: true,
          };
        }
        throw new NotFoundException();
      }),
      availability: jest.fn().mockResolvedValue({
        slots: [{ from: '09:00', to: '09:30' }],
      }),
    };

    beforeAll(async () => {
      app = await buildPublicApp(service);
    });

    afterAll(async () => {
      await app.close();
    });

    it('GET /api/v1/workers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/workers')
        .query({ salon_id: 'salon1' })
        .expect(200);
      expect(res.body).toEqual({
        items: [
          {
            id: 'w1',
            salon_id: 'salon1',
            first_name: 'John',
            last_name: 'Doe',
            is_active: true,
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
      });
    });

    it('GET /api/v1/workers/:id', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/workers/w1')
        .expect(200);
      expect(res.body.id).toBe('w1');

      await request(app.getHttpServer())
        .get('/api/v1/workers/unknown')
        .expect(404);
    });

    it('GET /api/v1/workers/:id/availability', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/workers/w1/availability')
        .query({ date: '2024-01-01' })
        .expect(200);
      expect(res.body).toEqual({ slots: [{ from: '09:00', to: '09:30' }] });
    });
  });

  describe('internal routes', () => {
    let app: INestApplication;
    const service: Partial<WorkersService> = {
      syncFromCrm: jest.fn().mockResolvedValue({ upserted: 1, unlinked: 0 }),
    };

    beforeAll(async () => {
      app = await buildInternalApp(service);
    });

    afterAll(async () => {
      await app.close();
    });

    it('POST /api/v1/internal/workers/sync requires key', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/internal/workers/sync')
        .send({ salon_id: 'salon1', workers: [] })
        .expect(401);

      await withInternalKey(
        request(app.getHttpServer())
          .post('/api/v1/internal/workers/sync')
          .send({ salon_id: 'salon1', workers: [] }),
      )
        .expect(200)
        .expect({ upserted: 1, unlinked: 0 });
    });
  });
});

