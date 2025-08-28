import { RequestCorrelationMiddleware, createChildLogger, getRequestId } from '@shared/logger';

describe('Global Logger', () => {
  it('binds x-request-id and ALS context', (done) => {
    const mw = new RequestCorrelationMiddleware();
    const req: any = { headers: {} };
    const res: any = { headers: {}, setHeader(k: string, v: string) { this.headers[k] = v; } };
    mw.use(req, res, () => {
      const rid = getRequestId();
      expect(typeof rid).toBe('string');
      expect(req.requestId).toBe(rid);
      expect(res.headers['x-request-id']).toBe(rid);
      done();
    });
  });

  it('child logger does not throw', () => {
    const log = createChildLogger('test');
    log.debug('hello debug'); log.info('hello info'); log.warn('hello warn'); log.error('hello error');
  });
});
