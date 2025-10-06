import type { Logger } from 'winston';
import type { SalonData } from '../dtos';

export type EasyWeekContext = {
  log: Logger | any;
  base: string;
  workspaceSlug?: string;
  locationId?: string;
  require<T>(v: T | undefined | null, name: string): T;
  doFetch(url: string, opts?: { method?: string; body?: any }): Promise<any>;
  fetchAll(url: string): Promise<any[]>;
  findLocationById(): Promise<any | null>;
  mapSalon(loc: any): SalonData;
};


