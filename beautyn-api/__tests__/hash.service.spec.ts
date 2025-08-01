import { HashService } from '../src/shared/services/hash.service';

describe('HashService', () => {
  it('hash() + verify() round-trip', async () => {
    const service = new HashService();
    const hash = await service.hash('test');
    const ok = await service.verify(hash, 'test');
    expect(ok).toBe(true);
  });
});
