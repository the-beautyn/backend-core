import { BadRequestException, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../shared/database/prisma.service';
import { verifyHmacHex } from '../crypto/signature';
import { CrmIntegrationService } from '../core/crm-integration.service';
import { OnboardingService } from '../../onboarding/onboarding.service';
import { TokenStorageService } from '../core/token-storage.service';
import { SyncTriggerService } from '../core/sync-trigger.service';

export type ConnectInput = {
  linkToken: string;
  externalSalonId: string;
  userDataRaw: string;
  signatureHex: string;
};

@Injectable()
export class AltegioWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crm: CrmIntegrationService,
    private readonly onboarding: OnboardingService,
    private readonly tokenStorage: TokenStorageService,
    private readonly syncTrigger: SyncTriggerService,
  ) {}

  async handleConnect(input: ConnectInput): Promise<'ok' | 'bad-signature'> {
    const secret = process.env.ALTEGIO_WEBHOOK_SECRET || '';
    const valid = verifyHmacHex({ secret, raw: input.userDataRaw, signatureHex: input.signatureHex });
    if (!valid) return 'bad-signature';

    const token = await this.prisma.crmLinkToken.findFirst({
      where: {
        token: input.linkToken,
        provider: 'ALTEGIO',
        used: false,
        expiresAt: { gt: new Date() },
      },
    });
    if (!token) {
      throw new BadRequestException('invalid or expired link token');
    }

    await this.prisma.crmLinkToken.update({ where: { id: token.id }, data: { used: true } });

    await this.crm.linkAltegio({ salonId: token.salonId, externalSalonId: input.externalSalonId });
    await this.crm.enqueueInitialSync(token.salonId);
    await this.onboarding.markCrmLinked(token.salonId, 'ALTEGIO');

    return 'ok';
  }

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
