/**
 * AuthService Tests
 * 
 * Note: This test suite uses the jsonwebtoken library for proper JWT token decoding
 * instead of manual string parsing. This approach is more robust and less likely
 * to break if the JWT format changes.
 */
import { INestApplication, ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';
import { AuthModule } from '../src/auth/auth.module';
import { UserRole } from '@prisma/client';
import { createTestApp } from '../test-utils/create-test-app';
import * as jwt from 'jsonwebtoken';

describe('AuthService', () => {
  let app: INestApplication;
  let service: AuthService;

  beforeAll(async () => {    
    app = await createTestApp([AuthModule]);
    service = app.get(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('register(): returns token & rejects duplicate', async () => {
    const res = await service.register({
      email: 'test@example.com',
      password: 'pass',
      role: UserRole.client,
    });
    expect(res).toHaveProperty('accessToken');
    await expect(
      service.register({ email: 'test@example.com', password: 'pass', role: UserRole.client }),
    ).rejects.toThrow(ConflictException);
  });

  it('login(): returns token with jti; rejects bad password', async () => {
    await service.register({ email: 'login@example.com', password: 'pass', role: UserRole.client });
    const loginRes = await service.login({ email: 'login@example.com', password: 'pass' });
    
    // Use proper JWT decoding instead of manual parsing
    const decoded = jwt.decode(loginRes.accessToken) as jwt.JwtPayload;
    expect(decoded.jti).toBeDefined();

    await expect(
      service.login({ email: 'login@example.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should properly decode JWT token structure', async () => {
    await service.register({ email: 'jwt@example.com', password: 'pass', role: UserRole.client });
    const loginRes = await service.login({ email: 'jwt@example.com', password: 'pass' });
    
    // Use JWT library to decode and verify token structure
    const decoded = jwt.decode(loginRes.accessToken) as jwt.JwtPayload;
    
    // Verify expected JWT payload structure
    expect(decoded).toHaveProperty('sub'); // subject (user ID)
    expect(decoded).toHaveProperty('role'); // user role
    expect(decoded).toHaveProperty('jti'); // JWT ID
    expect(decoded).toHaveProperty('iat'); // issued at
    expect(decoded).toHaveProperty('exp'); // expiration
    
    // Verify data types
    expect(typeof decoded.sub).toBe('string');
    expect(typeof decoded.role).toBe('string');
    expect(typeof decoded.jti).toBe('string');
    expect(typeof decoded.iat).toBe('number');
    expect(typeof decoded.exp).toBe('number');
  });
});
