import { HashService } from '../src/auth/hash.service';

describe('HashService', () => {
  let service: HashService;

  beforeEach(() => {
    service = new HashService();
  });

  it('hash() + verify() round-trip', async () => {
    const password = 'secret';
    const hashed = await service.hash(password);
    expect(hashed).not.toEqual(password);
    const isValid = await service.verify(password, hashed);
    expect(isValid).toBe(true);
  });
});
