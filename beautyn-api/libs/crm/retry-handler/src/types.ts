export interface RetryOptions {
  attempts?: number;        // total tries incl. first call
  baseDelayMs?: number;     // initial backoff
  maxDelayMs?: number;      // cap
  jitter?: boolean;         // randomize within [0, delay]
  onRetry?: (e: unknown, attempt: number, nextDelayMs: number) => void;
  classify?: (e: unknown) => { retryable: boolean; delayOverrideMs?: number };
}

export interface CircuitBreakerOptions {
  failThreshold?: number;    // consecutive failures to open
  coolDownMs?: number;       // stay open this long
  halfOpenMaxCalls?: number; // allowed concurrent trials in half-open
}

export type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

