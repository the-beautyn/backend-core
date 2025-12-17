import { ErrorKind } from './types';

/** CRM domain error with retry hint. */
export class CrmError extends Error {
  readonly kind: ErrorKind;
  readonly retryable: boolean;
  readonly cause?: unknown;
  readonly vendorMessage?: string;

  constructor(message: string, opts: { kind: ErrorKind; retryable?: boolean; cause?: unknown; vendorMessage?: string }) {
    super(message);
    this.name = 'CrmError';
    this.kind = opts.kind;
    // Default retry policy: true for RATE_LIMIT, NETWORK, AUTH; false otherwise (unless explicitly set)
    this.retryable =
      opts.retryable ??
      (opts.kind === ErrorKind.RATE_LIMIT ||
        opts.kind === ErrorKind.NETWORK ||
        opts.kind === ErrorKind.AUTH);
    this.cause = opts.cause;
    this.vendorMessage = opts.vendorMessage;
    // Clean stack
    if (Error.captureStackTrace) Error.captureStackTrace(this, CrmError);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      kind: this.kind,
      retryable: this.retryable,
      vendorMessage: this.vendorMessage,
    } as const;
  }
}

/** Returns true if the error is a retryable CrmError. */
export function isRetryable(e: unknown): boolean {
  return e instanceof CrmError ? e.retryable : false;
}
