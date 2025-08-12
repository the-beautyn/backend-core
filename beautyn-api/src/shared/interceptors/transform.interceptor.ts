// beautyn-api/src/shared/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

interface Envelope<T> {
  success: boolean;
  data: T | null;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Envelope<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<Envelope<T>> {
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
