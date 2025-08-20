import { INestApplication, CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { ServicesController } from '../../../src/api-gateway/v1/public/services.controller';
import { ServicesInternalController } from '../../../src/api-gateway/v1/internal/services.internal.controller';
import { ServicesService } from '../../../src/services/services.service';
import { InternalApiKeyGuard } from '../../../src/api-gateway/v1/internal/onboarding.internal.controller';

@Injectable()
class TestInternalApiKeyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const key = req.headers['x-internal-key'];
    if (key === 'test-key') return true;
    throw new UnauthorizedException();
  }
}

export async function buildPublicApp(service: Partial<ServicesService>): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [ServicesController],
    providers: [{ provide: ServicesService, useValue: service }],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

export async function buildInternalApp(service: Partial<ServicesService>): Promise<INestApplication> {
  process.env.INTERNAL_API_KEY = 'test-key';
  const moduleRef = await Test.createTestingModule({
    controllers: [ServicesInternalController],
    providers: [{ provide: ServicesService, useValue: service }],
  })
    .overrideGuard(InternalApiKeyGuard)
    .useClass(TestInternalApiKeyGuard)
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

export function withInternalKey(req: request.Test): request.Test {
  return req.set('x-internal-key', 'test-key');
}
