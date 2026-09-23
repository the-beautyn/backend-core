import { HttpException, Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../shared/database/prisma.service';
import { AltegioPartnerClient } from '../clients/altegio-partner.client';
import { OnboardingService } from '../../onboarding/onboarding.service';
import { CrmIntegrationService } from '../core/crm-integration.service';

// Connect flow via link token has been removed

// 'link_failed': the code was right but no salon could be linked. The code is
// released again so the owner can submit it once more within its TTL.
export type AltegioConfirmResult = 'ok' | 'invalid' | 'expired' | 'link_failed';

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
    externalSalonIds,
  }: {
    code: string;
    externalSalonIds: string[];
  }): Promise<AltegioConfirmResult> {
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

    // Claim the code atomically: two confirms racing on the same code both passed the
    // checks above, only one gets past this guard. The TTL and attempt limit are part
    // of the guard so the row read above cannot go stale in between. The claim is
    // handed back below if nothing gets linked, so the owner can retry with the code.
    const claimed = await this.prisma.crmPairingCode.updateMany({
      where: { id: row.id, usedAt: null, expiresAt: { gt: now }, attempts: { lt: 10 } },
      data: { usedAt: now },
    });
    if (claimed.count === 0) {
      return 'invalid';
    }

    // BEA-75: the CRM step is only done once a salon is actually linked. A failed link
    // used to be logged at debug, the step marked anyway and 'ok' returned, so the owner
    // reached Brand with zero salons and the salon that paired later never joined it.
    // One bad salon in a multi-salon install must not block the others — whether the
    // partner refused it or it belongs to someone else. The first such rejection is
    // kept and surfaced only when nothing at all linked.
    let linked = 0;
    let rejection: HttpException | undefined;
    for (const externalSalonId of externalSalonIds) {
      try {
        // Confirm with Altegio partner API, then link
        await this.altegioPartner.confirmRegistration(externalSalonId);
        await this.crmIntegration.linkAltegio({ userId: row.userId, externalSalonIds: [externalSalonId] });
        linked += 1;
      } catch (error) {
        if (error instanceof HttpException) {
          rejection ??= error;
          this.logger.warn(`Altegio salon ${externalSalonId} not linked for user ${row.userId}: ${error.message}`);
          continue;
        }
        this.logger.error(
          `Failed to link Altegio salon ${externalSalonId} for user ${row.userId}: ${(error as Error)?.message}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    if (linked === 0) {
      await this.releaseCode(row.id);
      if (rejection) throw rejection;
      return 'link_failed';
    }

    await this.onboardingService.markCrmLinkedByUser(row.userId);
    return 'ok';
  }

  private async releaseCode(id: string): Promise<void> {
    await this.prisma.crmPairingCode.update({ where: { id }, data: { usedAt: null } });
  }
}
