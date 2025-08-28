import { AsyncLocalStorage } from 'async_hooks';

export type RequestContext = { requestId: string };

const als = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return als.run(ctx, fn);
}

export function getRequestId(): string | undefined {
  return als.getStore()?.requestId;
}
