import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../src/users/users.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [UsersService, PrismaService],
    }).compile();

    service = moduleRef.get<UsersService>(UsersService);
  });

  it('create() + findByEmail() persists row', async () => {
    const email = 'test@example.com';
    await service.create({ email, password: 'password' });
    const user = await service.findByEmail(email);
    expect(user).toBeDefined();
    expect(user.email).toBe(email);
  });
});
