import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SharedModule } from '../src/shared/shared.module';
import { PrismaService } from '../src/shared/database/prisma.service';
import { setupTestEnvironment } from './test-config';

export async function createTestApp(imports: any[] = []): Promise<INestApplication> {
  // Setup test environment
  setupTestEnvironment();
  
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [SharedModule, ...imports],
  }).compile();
  
  const app = moduleRef.createNestApplication();
  await app.init();
  
  // Get Prisma service for test cleanup
  const prisma = app.get(PrismaService);
  
  // Clean up any existing test data
  await cleanupTestData(prisma);
  
  return app;
}

export async function cleanupTestApp(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  
  // Clean up test data after each test
  await cleanupTestData(prisma);
  
  await prisma.$disconnect();
  await app.close();
}

async function cleanupTestData(prisma: PrismaService): Promise<void> {
  // Delete all test data in reverse order of dependencies
  await prisma.revokedToken.deleteMany();
  await prisma.user.deleteMany();
}
