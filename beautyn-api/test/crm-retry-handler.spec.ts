import { executeWithRetry } from '@crm/retry-handler';
import { calcDelay, applyJitter } from '@crm/retry-handler';
import { CircuitBreaker, BreakerOpenError } from '@crm/retry-handler';

describe('executeWithRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('retries on retryable errors with exponential backoff', async () => {
    let calls = 0;
    const fn = jest.fn(async () => {
      calls++;
      if (calls < 3) throw new Error('transient');
      return 'ok';
    });

    const classify = () => ({ retryable: true });
    const onRetry = jest.fn();

    const prom = executeWithRetry(fn, { attempts: 5, baseDelayMs: 100, maxDelayMs: 800, jitter: false, classify, onRetry });

    // Fast-forward timers: delays should be 100 then 200
    await jest.advanceTimersByTimeAsync(100);
    await jest.advanceTimersByTimeAsync(200);

    const res = await prom;
    expect(res).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('stops when classify says non-retryable', async () => {
    const fn = jest.fn(async () => { throw new Error('boom'); });
    await expect(executeWithRetry(fn, { classify: () => ({ retryable: false }) })).rejects.toThrow('boom');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('backoff helpers', () => {
  it('calcDelay grows and caps', () => {
    expect(calcDelay(1, 100, 500)).toBe(100);
    expect(calcDelay(2, 100, 500)).toBe(200);
    expect(calcDelay(3, 100, 500)).toBe(400);
    expect(calcDelay(4, 100, 500)).toBe(500); // capped
  });

  it('applyJitter stays within [0, delay] when enabled', () => {
    const d = 400;
    for (let i=0; i<10; i++) {
      const j = applyJitter(d, true);
      expect(j).toBeGreaterThanOrEqual(0);
      expect(j).toBeLessThanOrEqual(d);
    }
    expect(applyJitter(d, false)).toBe(d);
  });
});

describe('CircuitBreaker', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('opens after threshold failures, stays open until coolDown, then half-opens', async () => {
    const br = new CircuitBreaker('test', { failThreshold: 2, coolDownMs: 1000, halfOpenMaxCalls: 1 });

    const failing = async () => { throw new Error('nope'); };

    await expect(br.run(failing)).rejects.toThrow('nope');
    expect(br.getState()).toBe('CLOSED');

    await expect(br.run(failing)).rejects.toThrow('nope'); // 2nd fail -> OPEN
    expect(br.getState()).toBe('OPEN');

    await expect(br.run(async () => 'x')).rejects.toThrow(BreakerOpenError); // still open

    // After coolDown, becomes HALF_OPEN
    jest.advanceTimersByTime(1000);
    await expect(br.run(async () => 'ok')).resolves.toBe('ok');
    expect(br.getState()).toBe('CLOSED');
  });

  it('limits half-open concurrency', async () => {
    const br = new CircuitBreaker('test', { failThreshold: 1, coolDownMs: 1000, halfOpenMaxCalls: 1 });
    // Open it
    await expect(br.run(async () => { throw new Error('fail'); })).rejects.toThrow('fail');
    expect(br.getState()).toBe('OPEN');

    jest.advanceTimersByTime(1000);

    // First half-open call in flight:
    const slow = br.run(async () => {
      await new Promise(r => setTimeout(r, 100));
      return 'ok';
    });

    // Second should be rejected while half-open slot is taken:
    await expect(br.run(async () => 'ok')).rejects.toThrow(BreakerOpenError);

    await jest.advanceTimersByTimeAsync(100);
    await expect(slow).resolves.toBe('ok');
    expect(br.getState()).toBe('CLOSED');
  });
});
