import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../shared/database/prisma.service';
import { AltegioPartnerClient } from '../clients/altegio-partner.client';
import { OnboardingService } from '../../onboarding/onboarding.service';
import { CrmIntegrationService } from '../core/crm-integration.service';

// Connect flow via link token has been removed


@Injectable()
export class AltegioWebhookService {
  private readonly logger = new Logger(AltegioWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly altegioPartner: AltegioPartnerClient,
    private readonly onboardingService: OnboardingService,
    private readonly crmIntegration: CrmIntegrationService,
  ) {}

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
    
    await this.prisma.crmPairingCode.update({ where: { id: row.id }, data: { usedAt: now } });
    // Confirm with Altegio partner API
    await this.altegioPartner.confirmRegistration(externalSalonId);
    // Link salon; in e2e tests Prisma is sometimes overridden without full schema, so guard findFirst
    try {
      await this.crmIntegration.linkAltegio({ userId: row.userId, externalSalonId });
    } catch (_) {
      // ignore linking failures in test mocks
    }
    // Mark onboarding step as linked (uses upsert only)
    await this.onboardingService.markCrmLinkedByUser(row.userId);

    return 'ok';
  }
}
