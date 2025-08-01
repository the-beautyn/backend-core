import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { execSync } from 'child_process';
import { SharedModule } from '../src/shared/shared.module';

export async function createTestApp(imports: any[] = []): Promise<INestApplication> {
  execSync('npx prisma db push --force-reset', {
    stdio: 'inherit',
    env: { ...process.env },
  });
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [SharedModule, ...imports],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}
