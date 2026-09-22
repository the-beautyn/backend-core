import { HttpException, Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../shared/database/prisma.service';
import { AltegioPartnerClient } from '../clients/altegio-partner.client';
import { OnboardingService } from '../../onboarding/onboarding.service';
import { CrmIntegrationService } from '../core/crm-integration.service';

// Connect flow via link token has been removed

// 'link_failed': the code was right but no salon could be linked. The code is left
// unused so the owner can submit it again within its TTL.
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
    
    // BEA-75: the CRM step is only done once a salon is actually linked. A failed link
    // used to be logged at debug, the step marked anyway and 'ok' returned, so the owner
    // reached Brand with zero salons and the salon that paired later never joined it.
    let linked = 0;
    for (const externalSalonId of externalSalonIds) {
      // Confirm with Altegio partner API
      await this.altegioPartner.confirmRegistration(externalSalonId);
      try {
        await this.crmIntegration.linkAltegio({ userId: row.userId, externalSalonIds: [externalSalonId] });
        linked += 1;
      } catch (error) {
        // A salon owned by someone else is the caller's problem: surface the 400 as is.
        if (error instanceof HttpException) throw error;
        this.logger.error(
          `Failed to link Altegio salon ${externalSalonId} for user ${row.userId}: ${(error as Error)?.message}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
    if (linked === 0) {
      return 'link_failed';
    }

    // Burn the code only now: a failed link above leaves it valid for a retry.
    await this.prisma.crmPairingCode.update({ where: { id: row.id }, data: { usedAt: now } });
    await this.onboardingService.markCrmLinkedByUser(row.userId);

    return 'ok';
  }
}
