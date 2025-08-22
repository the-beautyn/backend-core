import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
  UnauthorizedException,
  Res,
  Post,
  Body,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { envelopeErrorSchema, envelopeSuccessOnly } from '../../../shared/utils/swagger-envelope.util';
import { AltegioConfirmDto } from '../../../crm-integration/webhooks/dto/altegio-confirm.dto';
import { AltegioWebhookService } from '../../../crm-integration/webhooks/altegio-webhook.service';

@ApiTags('Webhooks / Altegio')
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

  @Get('redirect')
  @ApiOperation({ summary: 'Altegio redirect page', description: 'Shows a small form to enter the 6-digit code' })
  @ApiOkResponse({ content: { 'text/html': { schema: { type: 'string', example: '<!doctype html>...' } } } })
  async redirect(@Query('salon_id') salonId: string, @Res() res: Response) {
    const html = [
      '<!doctype html><html><body>',
      '<form method="POST" action="/api/v1/webhooks/altegio/confirm">',
      `<input type="hidden" name="salon_id" value="${salonId}"/>`,
      '<input type="text" name="code"/>',
      '<button type="submit">Connect</button>',
      '</form></body></html>',
    ].join('');
    res.type('html').send(html);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm Altegio linking with a 6-digit code' })
  @ApiOkResponse(envelopeSuccessOnly())
  @ApiBadRequestResponse(envelopeErrorSchema())
  async confirm(@Body() dto: AltegioConfirmDto) {
    const result = await this.service.confirm({ code: dto.code, externalSalonId: dto.salon_id });
    if (result !== 'ok') {
      throw new BadRequestException('Invalid or expired code');
    }
    return { success: true };
  }
}
