// beautyn-api/src/shared/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { SKIP_RESPONSE_TRANSFORM } from '../decorators/skip-response-transform.decorator';

interface Envelope<T> {
  success: boolean;
  data: T | null;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, T | Envelope<T>>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<T | Envelope<T>> {
    // Handlers marked with @SkipResponseTransform() are passed through
    // untouched — for bodies with a fixed external schema (AASA, raw HTML,
    // etc.) that external parsers will reject if wrapped in { success, data }.
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESPONSE_TRANSFORM,
      [context.getHandler(), context.getClass()],
    );
    if (skip) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data: T) => {
        // If handler already produced an envelope, pass it through
        if (data && typeof data === 'object' && 'success' in data) {
          return data as unknown as Envelope<T>;
        }
        return { success: true, data: data ?? null };
      }),
    );
  }
}
