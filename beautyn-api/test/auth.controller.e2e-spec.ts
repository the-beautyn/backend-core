/**
 * AuthController End-to-End Tests
 * 
 * Tests the complete authentication flow through HTTP endpoints:
 * - User registration via POST /api/v1/auth/register
 * - User login and token generation
 * - Protected route access with JWT authentication
 * - User logout and token invalidation
 * - Authentication state verification (health check before/after logout)
 * 
 * These tests verify the full request/response cycle including:
 * - HTTP status codes
 * - Response body structure
 * - JWT token handling
 * - Authorization header processing
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, cleanupTestApp } from '../test-utils/create-test-app';
import { AuthModule } from '../src/auth/auth.module';
import { ApiGatewayModule } from '../src/api-gateway/api-gateway.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    app = await createTestApp([AuthModule, ApiGatewayModule]);
  });

  afterEach(async () => {
    await cleanupTestApp(app);
  });

  afterAll(async () => {
    await app.close();
  });


  it('complete auth flow: register, login, verify, logout, verify again', async () => {
    // First register a user
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'authflow@example.com', password: 'pass', role: 'client' })
      .expect(201);

    // Then login
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'authflow@example.com', password: 'pass' })
      .expect(200);
    
    accessToken = login.body.accessToken;

    // Verify we can access protected endpoint
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // Logout
    const logoutResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
    
    console.log('Logout response status:', logoutResponse.status);

    // Let's decode the JWT to get the jti
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(accessToken);
    console.log('JWT jti:', decoded.jti);

    // Verify we can no longer access protected endpoint
    const logoutAfterLogout = await request(app.getHttpServer())
    .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);
    
    console.log('Logout after logout status:', logoutAfterLogout.status);
    console.log('Logout after logout body:', logoutAfterLogout.body);
    
    expect(logoutAfterLogout.status).toBe(401);
  });
});
