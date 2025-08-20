import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { verifyHmacHex } from '../crypto/signature';
import { CrmIntegrationService } from '../core/crm-integration.service';
import { OnboardingService } from '../../onboarding/onboarding.service';

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
}
