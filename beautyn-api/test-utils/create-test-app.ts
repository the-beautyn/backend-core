import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { execSync } from 'node:child_process';

import { SharedModule } from '../src/shared/shared.module';

export async function createTestApp(): Promise<INestApplication> {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'file:./test.db?connection_limit=1&mode=memory';
  }

  execSync('npx prisma migrate reset --force --skip-generate --skip-seed', {
    stdio: 'inherit',
  });

  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [SharedModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}
