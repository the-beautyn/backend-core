import { Inject, Injectable } from '@nestjs/common';
import { CrmType, TokenBundle } from '@crm/shared';
import { TOKEN_STORAGE_REPOSITORY } from './tokens';
import type { TokenStorageRepository } from './repository';
import { encryptBundle, decryptBundle } from './crypto.helper';

@Injectable()
export class TokenStorageService {
  constructor(
    @Inject(TOKEN_STORAGE_REPOSITORY)
    private readonly repo: TokenStorageRepository,
  ) {}

  async get(salonId: string, provider: CrmType): Promise<TokenBundle | null> {
    const row = await this.repo.findUnique(salonId, provider);
    if (!row) return null;
    return decryptBundle(
      { cipherText: row.cipherText, iv: row.iv, authTag: row.authTag },
      salonId,
      provider,
    );
  }

  async store(salonId: string, provider: CrmType, bundle: TokenBundle): Promise<void> {
    const enc = encryptBundle(bundle, salonId, provider);
    await this.repo.upsert({
      salonId,
      provider,
      cipherText: enc.cipherText,
      iv: enc.iv,
      authTag: enc.authTag,
    } as any);
  }

  async delete(salonId: string, provider: CrmType): Promise<void> {
    await this.repo.delete(salonId, provider);
  }
}

