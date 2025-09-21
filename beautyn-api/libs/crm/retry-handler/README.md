# CRM Retry Handler

Lightweight, dependency-free utilities to make calling external CRMs safer:

- `executeWithRetry(fn, opts?)`: Exponential backoff with optional jitter and pluggable error classification (defaults to `@crm/shared` `isRetryable`).
- `CircuitBreaker`: Tiny circuit breaker with `CLOSED` → `OPEN` → `HALF_OPEN` transitions and half-open concurrency limit.

## Environment Defaults

You can override options via environment variables:

- `CRM_RETRY_ATTEMPTS` (default: `3`) – total tries including the first call
- `CRM_RETRY_BASE_DELAY_MS` (default: `500`) – initial backoff delay in ms
- `CRM_RETRY_MAX_DELAY_MS` (default: `4000`) – max backoff delay cap in ms
- `CRM_RETRY_JITTER` (default: `true`) – whether to apply full jitter `[0, delay]`

## Quick Start

```ts
import { executeWithRetry } from '@crm/retry-handler';

const data = await executeWithRetry(async () => {
  // call external CRM
  return await fetchSomething();
});
```

Custom classification and retry hook:

```ts
await executeWithRetry(doWork, {
  attempts: 5,
  baseDelayMs: 200,
  maxDelayMs: 2000,
  jitter: true,
  classify: (e) => ({ retryable: isTransient(e) }),
  onRetry: (e, attempt, nextDelay) => {
    logger.warn({ err: e, attempt, nextDelay }, 'Retrying...');
  },
});
```

## Circuit Breaker

```ts
import { CircuitBreaker, BreakerOpenError } from '@crm/retry-handler';

const breaker = new CircuitBreaker('crm.search', {
  failThreshold: 5,     // consecutive failures to open
  coolDownMs: 15_000,   // stay OPEN this long
  halfOpenMaxCalls: 1,  // allow only 1 test call in HALF_OPEN
});

try {
  const result = await breaker.run(() => callCrm());
  // success
} catch (e) {
  if (e instanceof BreakerOpenError) {
    // short-circuit fallback
  } else {
    // real error from call
  }
}
```

## Notes

- Pure TypeScript. No external dependencies.
- Designed to be used by CRM integrations; pairs well with `@crm/shared` types and `CrmError`/`isRetryable`.

