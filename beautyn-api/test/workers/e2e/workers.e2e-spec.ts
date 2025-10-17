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
      listPublic: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'w1',
            firstName: 'John',
            lastName: 'Doe',
            photoUrl: null,
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
      }),
      getPublicById: jest.fn().mockImplementation((id: string) => {
        if (id === 'w1') {
          return {
            id: 'w1',
            firstName: 'John',
            lastName: 'Doe',
            photoUrl: null,
          };
        }
        throw new NotFoundException();
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
      expect(res.body.items[0].firstName).toBe('John');
      expect(res.body.items[0].email).toBeUndefined();
    });

    it('GET /api/v1/workers/by-id/:id', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/workers/by-id/w1')
        .expect(200);
      expect(res.body).toMatchObject({
        id: 'w1',
        firstName: 'John',
        lastName: 'Doe',
      });

      await request(app.getHttpServer())
        .get('/api/v1/workers/unknown')
        .expect(404);
    });
  });

  describe('internal routes', () => {
    let app: INestApplication;
    const service: Partial<WorkersService> = {
      syncFromCrm: jest.fn().mockResolvedValue({ upserted: 1, deleted: 0, workers: [] }),
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
        .send({ salonId: 'salon1', workers: [] })
        .expect(401);

      await withInternalKey(
        request(app.getHttpServer())
          .post('/api/v1/internal/workers/sync')
          .send({ salonId: 'salon1', workers: [] }),
      )
        .expect(200)
        .expect({ upserted: 1, deleted: 0, workers: [] });
    });
  });
});
