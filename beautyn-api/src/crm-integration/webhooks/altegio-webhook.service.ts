import { BadRequestException, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../shared/database/prisma.service';
import { CrmIntegrationService } from '../core/crm-integration.service';
import { OnboardingService } from '../../onboarding/onboarding.service';
import { TokenStorageService } from '../core/token-storage.service';
import { SyncTriggerService } from '../core/sync-trigger.service';

// Connect flow via link token has been removed

@Injectable()
export class AltegioWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crm: CrmIntegrationService,
    private readonly onboarding: OnboardingService,
    private readonly tokenStorage: TokenStorageService,
    private readonly syncTrigger: SyncTriggerService,
  ) {}

  // handleConnect removed

  async confirm({
    code,
    externalSalonId,
  }: {
    code: string;
    externalSalonId: string;
  }): Promise<'ok' | 'invalid' | 'expired'> {
    const pepper = process.env.PAIRING_CODE_PEPPER || '';
    const hash = createHmac('sha256', pepper).update(code).digest('hex');
    const row = await this.prisma.crmPairingCode.findFirst({
      where: {
        provider: 'ALTEGIO',
        codeHash: hash,
      },
    });
    if (!row) {
      return 'invalid';
    }
    const now = new Date();
    if (row.usedAt || row.attempts >= 10) {
      return 'invalid';
    }
    if (row.expiresAt <= now) {
      await this.prisma.crmPairingCode.update({
        where: { id: row.id },
        data: { attempts: { increment: 1 } },
      });
      return 'expired';
    }
    if (!timingSafeEqual(Buffer.from(row.codeHash), Buffer.from(hash))) {
      await this.prisma.crmPairingCode.update({
        where: { id: row.id },
        data: { attempts: { increment: 1 } },
      });
      return 'invalid';
    }
    const salonId = row.salonId || 'REPLACE_ME_WITH_LOOKUP';
    await this.tokenStorage.saveExternalSalonId(salonId, 'ALTEGIO', externalSalonId);
    await this.syncTrigger.triggerInitialSync({ salonId, provider: 'ALTEGIO' });

    const base = process.env.INTERNAL_API_BASE_URL;
    const key = process.env.INTERNAL_API_KEY;
    if (base && key) {
      try {
        await fetch(`${base}/internal/onboarding/crm-linked`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-internal-key': key },
          body: JSON.stringify({ salon_id: salonId, provider: 'ALTEGIO' }),
        });
      } catch (_) {
        // ignore
      }
    }

    await this.prisma.crmPairingCode.update({
      where: { id: row.id },
      data: { usedAt: now },
    });

    return 'ok';
  }
}
