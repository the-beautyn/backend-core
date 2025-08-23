import {
  Controller,
  Get,
  Query,
  BadRequestException,
  Res,
  Post,
  Body,
  Req,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';
import { envelopeErrorSchema, envelopeSuccessOnly } from '../../../shared/utils/swagger-envelope.util';
import { AltegioConfirmDto } from '../../../crm-integration/webhooks/dto/altegio-confirm.dto';
import { AltegioWebhookService } from '../../../crm-integration/webhooks/altegio-webhook.service';

@ApiExcludeController()
@Controller('api/v1/webhooks/altegio')
export class AltegioWebhookController {
  constructor(private readonly service: AltegioWebhookService) {}

  @Get('redirect')
  async redirect(@Query('salon_id') salonId: string, @Res() res: Response, @Req() req: Request) {
    const esc = (s: string) =>
      String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const safeSalonId = esc(salonId || '');
    const base = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const action = `${base.replace(/\/$/, '')}/api/v1/webhooks/altegio/confirm`;
    const html = [
      '<!doctype html><html><body>',
      `<form method="POST" action="${action}">`,
      `<input type="hidden" name="salon_id" value="${safeSalonId}"/>`,
      '<input type="text" name="code"/>',
      '<button type="submit">Connect</button>',
      '</form></body></html>',
    ].join('');
    res.type('html').send(html);
  }

  @Post('confirm')
  async confirm(@Body() dto: AltegioConfirmDto) {
    const result = await this.service.confirm({ code: dto.code, externalSalonId: dto.salon_id });
    if (result !== 'ok') {
      throw new BadRequestException('Invalid or expired code');
    }
    return { success: true };
  }
}
