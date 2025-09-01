import { Injectable } from '@nestjs/common';
import type { ShadowStoreRepository } from './shadow-store.repository';
import { ShadowSnapshot } from './types';

@Injectable()
export class ShadowStoreService {
  constructor(private readonly repo: ShadowStoreRepository) {}
  get(entityType: string, entityId: string, provider: string) { return this.repo.get(entityType, entityId, provider); }
  async update(entityType: string, entityId: string, provider: string, snapshot: ShadowSnapshot) { await this.repo.save(entityType, entityId, provider, snapshot); }
}

