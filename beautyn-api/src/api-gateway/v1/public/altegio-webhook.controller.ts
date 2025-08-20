import { Controller, Get, Param, Query, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AltegioWebhookService } from '../../../crm-integration/webhooks/altegio-webhook.service';

@Controller('api/v1/webhooks/altegio')
export class AltegioWebhookController {
  constructor(private readonly service: AltegioWebhookService) {}

  @Get('connect/:linkToken')
  async connect(
    @Param('linkToken') linkToken: string,
    @Query('salon_id') salonId: string,
    @Query('user_data') userData: string,
    @Query('user_data_sign') userDataSign: string,
  ) {
    if (!linkToken || !salonId || !userData || !userDataSign) {
      throw new BadRequestException('missing parameters');
    }
    const res = await this.service.handleConnect({
      linkToken,
      externalSalonId: salonId,
      userDataRaw: userData,
      signatureHex: userDataSign,
    });
    if (res === 'bad-signature') {
      throw new UnauthorizedException();
    }
    return 'ok';
  }
}
