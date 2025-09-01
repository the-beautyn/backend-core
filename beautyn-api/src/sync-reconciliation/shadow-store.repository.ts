import { ShadowSnapshot } from './types';

export interface ShadowStoreRepository {
  get(entityType: string, entityId: string, provider: string): Promise<ShadowSnapshot | null>;
  save(entityType: string, entityId: string, provider: string, snap: ShadowSnapshot): Promise<void>;
}

