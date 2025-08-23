import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { WorkersService } from '../../../src/workers/workers.service';
import { WorkersController } from '../../../src/api-gateway/v1/public/workers.controller';
import { WorkersInternalController } from '../../../src/api-gateway/v1/internal/workers.internal.controller';
import { InternalApiKeyGuard } from '../../../src/shared/guards/internal-api-key.guard';

export async function buildPublicApp(serviceMock: Partial<WorkersService>) {
  const moduleRef: TestingModule = await Test.createTestingModule({
    controllers: [WorkersController],
    providers: [WorkersService],
  })
    .overrideProvider(WorkersService)
    .useValue(serviceMock)
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

export async function buildInternalApp(serviceMock: Partial<WorkersService>) {
  process.env.INTERNAL_API_KEY = 'test-key';
  const moduleRef: TestingModule = await Test.createTestingModule({
    controllers: [WorkersInternalController],
    providers: [WorkersService],
  })
    .overrideProvider(WorkersService)
    .useValue(serviceMock)
    .overrideGuard(InternalApiKeyGuard)
    .useValue({
      canActivate: (ctx: any) => {
        const key = ctx.switchToHttp().getRequest().headers['x-internal-key'];
        if (key !== process.env.INTERNAL_API_KEY) {
          throw new UnauthorizedException();
        }
        return true;
      },
    })
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

export function withInternalKey(req: request.Test) {
  const key = process.env.INTERNAL_API_KEY ?? '';
  return req.set('x-internal-key', key);
}

