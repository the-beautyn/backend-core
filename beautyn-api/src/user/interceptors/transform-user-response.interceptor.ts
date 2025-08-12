import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from '../dto/user-response.dto';

@Injectable()
export class TransformUserResponseInterceptor
  implements NestInterceptor
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<UserResponseDto> {
    return next.handle().pipe(
      map((data) =>
        plainToInstance(UserResponseDto, data, {
          excludeExtraneousValues: true,
        }),
      ),
    );
  }
}
