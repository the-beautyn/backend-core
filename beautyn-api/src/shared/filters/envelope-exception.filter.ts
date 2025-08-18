import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';

@Catch()
export class EnvelopeExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    // Always log exceptions to the console for debugging (especially 500s)
    try {
      if (exception instanceof HttpException) {
        const res = exception.getResponse();
        Logger.error(
          `HTTP ${exception.getStatus()} - ${JSON.stringify(res)}`,
          exception.stack,
          'EnvelopeExceptionFilter',
        );
      } else if (exception instanceof Error) {
        Logger.error(exception.message, exception.stack, 'EnvelopeExceptionFilter');
      } else {
        Logger.error('Unknown exception', JSON.stringify(exception), 'EnvelopeExceptionFilter');
      }
    } catch (_) {}

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? (exception as HttpException).getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extract Nest/Validation exception body if available
    let payload: any = { message: 'Internal server error' };
    if (isHttp) {
      const res = (exception as HttpException).getResponse();
      if (typeof res === 'string') {
        payload = { message: res };
      } else if (res && typeof res === 'object') {
        payload = res;
      }
    }

    // Standardize envelope
    const body = {
      success: false,
      data: {
        ...payload,
        // In non-production, include error details to speed up debugging
        ...(process.env.NODE_ENV !== 'production'
          ? {
              _error:
                exception instanceof Error
                  ? { message: exception.message, stack: exception.stack }
                  : exception,
            }
          : {}),
      },
    };

    response.status(status).json(body);
  }
}


