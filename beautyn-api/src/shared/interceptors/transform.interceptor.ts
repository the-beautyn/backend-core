import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { map } from 'rxjs';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, { success: boolean; data: T }>
{
  intercept(_c: ExecutionContext, next: CallHandler<T>) {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && data.success === true) return data;
        return { success: true, data: data ?? null };
      }),
    );
  }
}
