import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class EnvelopeExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

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
      data: payload,
    };

    response.status(status).json(body);
  }
}


