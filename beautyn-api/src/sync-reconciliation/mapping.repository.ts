export interface MappingRepository {
  /** Returns external id for an internal entity; null if not mapped. */
  getExternalId(entityType: 'category'|'service'|'worker', entityId: string, provider: string): Promise<string | null>;
  /** Sets or updates mapping. */
  setExternalId(entityType: 'category'|'service'|'worker', entityId: string, provider: string, externalId: string): Promise<void>;
  /** Deletes mapping row (e.g., after delete). */
  deleteMapping(entityType: 'category'|'service'|'worker', entityId: string, provider: string): Promise<void>;
}

