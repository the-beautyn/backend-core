import { createChildLogger } from '@shared/logger';
import { CrmError, ErrorKind } from '@crm/shared';

export function notImplemented(method: string): never {
  const log = createChildLogger('provider.core');
  log.warn('Provider method not implemented', { method });
  throw new CrmError(`Not implemented: ${method}`, { kind: ErrorKind.INTERNAL, retryable: false });
}

