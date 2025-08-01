/**
 * AppController End-to-End Tests
 *
 * Tests the main application controller and basic application functionality:
 * - Root endpoint accessibility (/)
 * - Basic HTTP response handling
 * - Application startup and routing
 *
 * These tests verify that the application starts correctly and responds
 * to basic requests, serving as a smoke test for the entire application.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { config } from 'dotenv';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    // Load test environment variables from .env.test
    config({ path: '.env.test' });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
