export interface CrmCredentialRow {
  id: string;
  salonId: string;      // UUID
  provider: string;     // CrmType string
  cipherText: Uint8Array;
  iv: Uint8Array;       // 12 bytes for GCM
  authTag: Uint8Array;  // 16 bytes
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenStorageRepository {
  findUnique(salonId: string, provider: string): Promise<CrmCredentialRow | null>;
  upsert(data: Omit<CrmCredentialRow, 'id' | 'createdAt' | 'updatedAt'>): Promise<void>;
  delete(salonId: string, provider: string): Promise<void>;
}

