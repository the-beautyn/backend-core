import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth/auth.service';
import { UsersService } from '../src/users/users.service';
import { HashService } from '../src/auth/hash.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [AuthService, UsersService, HashService],
    }).compile();

    service = moduleRef.get<AuthService>(AuthService);
  });

  it('register returns id and email', async () => {
    const email = 'user@example.com';
    const res = await service.register({ email, password: 'password' });
    expect(res).toHaveProperty('id');
    expect(res).toHaveProperty('email', email);
  });

  it('register rejects duplicate email', async () => {
    const email = 'dup@example.com';
    await service.register({ email, password: 'pass' });
    await expect(
      service.register({ email, password: 'pass' }),
    ).rejects.toBeDefined();
  });

  it('login returns token with jti', async () => {
    const email = 'login@example.com';
    await service.register({ email, password: 'pass' });
    const res = await service.login({ email, password: 'pass' });
    expect(res.accessToken).toBeDefined();
    const payload: any = JSON.parse(
      Buffer.from(res.accessToken.split('.')[1], 'base64').toString(),
    );
    expect(payload.jti).toBeDefined();
  });

  it('login rejects bad password', async () => {
    const email = 'badpass@example.com';
    await service.register({ email, password: 'good' });
    await expect(
      service.login({ email, password: 'bad' }),
    ).rejects.toBeDefined();
  });
});
