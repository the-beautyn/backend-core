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
import { createChildLogger } from '@shared/logger';

@ApiExcludeController()
@Controller('api/v1/webhooks/altegio')
export class AltegioWebhookController {
  private readonly log = createChildLogger('altegio-webhook.controller');
  constructor(private readonly service: AltegioWebhookService) {}

  @Get('redirect')
  async redirect(@Query() query: any, @Res() res: Response, @Req() req: Request) {
    const pickSalonIds = (q: any): string[] => {
      const results: string[] = [];
      const candidates: unknown[] = [];
      if (q && q.salon_id != null) {
        candidates.push(q.salon_id);
      }
      // Typical parsers
      const ids = q?.salon_ids;
      if (ids != null) {
        if (Array.isArray(ids)) {
          candidates.push(...ids);
        } else if (typeof ids === 'object') {
          const ordered = Object.keys(ids)
            .sort()
            .map((k) => (ids as Record<string, unknown>)[k]);
          candidates.push(...ordered);
        } else {
          candidates.push(ids);
        }
      }
      // Simple parser case: keys like "salon_ids[0]" remain literal
      for (const [key, value] of Object.entries(q ?? {})) {
        if (key.startsWith('salon_ids[')) {
          candidates.push(value as unknown);
        }
      }
      // As a last resort, parse raw query string to catch any encoding quirks
      const raw = (req.url || '').split('?')[1] || '';
      if (raw) {
        const usp = new URLSearchParams(raw);
        for (const [k, v] of usp.entries()) {
          if (decodeURIComponent(k).startsWith('salon_ids[')) {
            candidates.push(v);
          } else if (k === 'salon_ids') {
            candidates.push(v);
          }
        }
      }
      for (const candidate of candidates) {
        const str = String(candidate).trim();
        if (/^[1-9]\d*$/.test(str)) {
          // preserve order while de-duping
          if (!results.includes(str)) results.push(str);
        }
      }
      return results;
    };
    const salonIds = pickSalonIds(query);
    this.log.info('Redirecting to Altegio confirm page', { salonIds });
    const esc = (s: string) =>
      String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const base = `${req.protocol}://${req.get('host')}`; //process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const action = `${base.replace(/\/$/, '')}/api/v1/webhooks/altegio/confirm`;
    const salonInputs = salonIds
      .map((salonId) => `<input type="hidden" name="salon_ids[]" value="${esc(salonId)}"/>`)
      .join('');
    const html = [
      '<!doctype html><html><body>',
      `<form method="POST" action="${action}">`,
      salonInputs,
      '<input type="text" name="code"/>',
      '<button type="submit">Connect</button>',
      '</form></body></html>',
    ].join('');
    res.type('html').send(html);
  }

  @Post('confirm')
  async confirm(@Body() dto: AltegioConfirmDto) {
    this.log.info('Confirming Altegio registration', { dto });
    const result = await this.service.confirm({ code: dto.code, externalSalonIds: dto.salon_ids });
    if (result !== 'ok') {
      throw new BadRequestException('Invalid or expired code');
    }
    return { success: true };
  }
}
