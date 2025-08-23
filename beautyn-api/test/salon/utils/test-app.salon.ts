import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { InternalApiKeyGuard } from '../../../src/shared/guards/internal-api-key.guard';

export async function buildPublicApp(controllers: any[], providers: any[]): Promise<INestApplication> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    controllers,
    providers,
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

export async function buildInternalApp(
  controllers: any[],
  providers: any[],
  internalKey = 'test_key',
): Promise<INestApplication> {
  const moduleBuilder = Test.createTestingModule({ controllers, providers })
    .overrideGuard(InternalApiKeyGuard)
    .useValue({
      canActivate: (ctx: ExecutionContext) => {
        const req = ctx.switchToHttp().getRequest();
        if (req.headers['x-internal-key'] !== internalKey) {
          throw new UnauthorizedException();
        }
        return true;
      },
    });

  const moduleRef = await moduleBuilder.compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

export function withInternalKey(req: any, key = 'test_key') {
  return req.set('x-internal-key', key);
}
