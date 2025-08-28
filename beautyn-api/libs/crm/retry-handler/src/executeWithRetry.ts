import { RetryOptions } from './types';
import { calcDelay, applyJitter, sleep } from './backoff';
import { isRetryable as isRetryableCrm } from '@crm/shared';

function envInt(name: string, def: number): number {
  const v = process.env[name];
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : def;
}

function envBool(name: string, def: boolean): boolean {
  const v = process.env[name];
  return v == null ? def : ['1','true','yes','on'].includes(String(v).toLowerCase());
}

export async function executeWithRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = opts.attempts ?? envInt('CRM_RETRY_ATTEMPTS', 3);
  const baseDelayMs = opts.baseDelayMs ?? envInt('CRM_RETRY_BASE_DELAY_MS', 500);
  const maxDelayMs  = opts.maxDelayMs ?? envInt('CRM_RETRY_MAX_DELAY_MS', 4000);
  const jitter      = opts.jitter ?? envBool('CRM_RETRY_JITTER', true);
  const classify    = opts.classify ?? ((e: unknown) => ({ retryable: isRetryableCrm(e) }));

  if (attempts < 1) throw new Error('attempts must be >= 1');

  let lastErr: unknown;

  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const c: { retryable: boolean; delayOverrideMs?: number } = classify(e) ?? { retryable: false };
      if (!c.retryable || i === attempts) throw e;

      const retryIndex = i; // 1..(attempts-1)
      let nextDelay = c.delayOverrideMs ?? calcDelay(retryIndex, baseDelayMs, maxDelayMs);
      nextDelay = applyJitter(nextDelay, jitter);
      opts.onRetry?.(e, i, nextDelay);
      await sleep(nextDelay);
    }
  }
  throw lastErr;
}

