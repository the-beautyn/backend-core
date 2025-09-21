import { CircuitBreakerOptions, BreakerState } from './types';

export class BreakerOpenError extends Error {
  constructor(public readonly nameId: string) {
    super(`CircuitBreaker "${nameId}" is OPEN`);
    this.name = 'BreakerOpenError';
  }
}

export class CircuitBreaker {
  private state: BreakerState = 'CLOSED';
  private consecutiveFails = 0;
  private openedAt = 0;
  private halfOpenInFlight = 0;

  readonly name: string;
  readonly opts: Required<CircuitBreakerOptions>;

  constructor(name: string, opts: CircuitBreakerOptions = {}) {
    this.name = name;
    this.opts = {
      failThreshold: opts.failThreshold ?? 5,
      coolDownMs: opts.coolDownMs ?? 15_000,
      halfOpenMaxCalls: opts.halfOpenMaxCalls ?? 1,
    };
  }

  getState(): BreakerState { return this.state; }

  private tryTransition(now: number) {
    if (this.state === 'OPEN' && now - this.openedAt >= this.opts.coolDownMs) {
      this.state = 'HALF_OPEN';
      this.halfOpenInFlight = 0;
    }
  }

  private recordSuccess() {
    this.consecutiveFails = 0;
    this.state = 'CLOSED';
    this.halfOpenInFlight = 0;
  }

  private recordFailure(now: number) {
    this.consecutiveFails += 1;
    if (this.state === 'HALF_OPEN' || this.consecutiveFails >= this.opts.failThreshold) {
      this.state = 'OPEN';
      this.openedAt = now;
      this.halfOpenInFlight = 0;
    }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    this.tryTransition(now);

    if (this.state === 'OPEN') throw new BreakerOpenError(this.name);

    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenInFlight >= this.opts.halfOpenMaxCalls) {
        throw new BreakerOpenError(this.name);
      }
      this.halfOpenInFlight++;
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (e) {
      this.recordFailure(Date.now());
      throw e;
    }
  }
}

