import type { Logger } from 'winston';

export type AltegioHttp = <T>(method: string, path: string, opts?: { query?: Record<string, any>; body?: any }) => Promise<T>;

export type AltegioContext = {
  log: Logger | any;
  baseUrl: string;
  externalSalonId?: number;
  http: AltegioHttp;
  stripHtml(html?: string | null): string | undefined;
  requireExternalSalonId(): number;
};


