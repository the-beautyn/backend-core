import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { runWithRequestContext } from '../context';

declare module 'http' {
  interface IncomingMessage { requestId?: string; }
}

@Injectable()
export class RequestCorrelationMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const header = 'x-request-id';
    const incoming = req.headers[header] as string | undefined;
    const trimmed = incoming ? String(incoming).trim() : '';
    const requestId = trimmed ? trimmed : randomUUID();
    req.requestId = requestId;
    res.setHeader(header, requestId);
    runWithRequestContext({ requestId }, next);
  }
}
