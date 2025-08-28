import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { createChildLogger } from '../logger.service';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  private log = createChildLogger('http');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<any>();
    const res = ctx.getResponse<any>();
    const method = req?.method;
    const url = req?.originalUrl || req?.url;

    this.log.info('Incoming request', { method, url });

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - start;
        const statusCode = res?.statusCode ?? 200;
        this.log.info('Request completed', { method, url, statusCode, durationMs, outcome: 'success' });
      }),
      catchError((err) => {
        const durationMs = Date.now() - start;
        const statusCode = res?.statusCode ?? 500;
        this.log.error('Request failed', {
          method, url, statusCode, durationMs, outcome: 'error',
          errorName: err?.name, errorMessage: err?.message,
        });
        return throwError(() => err);
      })
    );
  }
}
