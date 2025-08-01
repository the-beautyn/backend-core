import { INestApplication, ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';
import { AuthModule } from '../src/auth/auth.module';
import { UserRole } from '@prisma/client';
import { createTestApp } from '../test-utils/create-test-app';

describe('AuthService', () => {
  let app: INestApplication;
  let service: AuthService;

  beforeAll(async () => {
    process.env.DATABASE_URL = 'file:./test.db?connection_limit=1&mode=memory';
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '1h';
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
    const [, payload] = loginRes.accessToken.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    expect(decoded.jti).toBeDefined();

    await expect(
      service.login({ email: 'login@example.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
