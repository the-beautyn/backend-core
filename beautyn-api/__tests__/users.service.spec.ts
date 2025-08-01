import { INestApplication } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from '../src/users/users.service';
import { UsersModule } from '../src/users/users.module';
import { createTestApp } from '../test-utils/create-test-app';

describe('UsersService', () => {
  let app: INestApplication;
  let service: UsersService;

  beforeAll(async () => {
    process.env.DATABASE_URL = 'file:./test.db?connection_limit=1&mode=memory';
    app = await createTestApp([UsersModule]);
    service = app.get(UsersService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('create() + findByEmail() persists row', async () => {
    const created = await service.create('user@example.com', 'hash', UserRole.client);
    const found = await service.findByEmail('user@example.com');
    expect(found).toMatchObject({ id: created.id, email: 'user@example.com' });
  });
});
