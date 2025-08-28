import { CrmError, ErrorKind, isRetryable } from '@crm/shared';

describe('CrmError', () => {
  it('defaults retryable for RATE_LIMIT/NETWORK/AUTH', () => {
    for (const kind of [ErrorKind.RATE_LIMIT, ErrorKind.NETWORK, ErrorKind.AUTH]) {
      const e = new CrmError('x', { kind });
      expect(e.retryable).toBe(true);
    }
    const v = new CrmError('bad input', { kind: ErrorKind.VALIDATION });
    expect(v.retryable).toBe(false);
  });

  it('toJSON shape', () => {
    const e = new CrmError('nope', { kind: ErrorKind.INTERNAL, retryable: false });
    expect(e.toJSON()).toEqual({
      name: 'CrmError',
      message: 'nope',
      kind: ErrorKind.INTERNAL,
      retryable: false,
    });
  });
});

describe('isRetryable', () => {
  it('reflects CrmError.retryable', () => {
    const yes = new CrmError('try again', { kind: ErrorKind.NETWORK });
    const no = new CrmError('stop', { kind: ErrorKind.VALIDATION });
    expect(isRetryable(yes)).toBe(true);
    expect(isRetryable(no)).toBe(false);
    expect(isRetryable(new Error('plain'))).toBe(false);
  });
});
