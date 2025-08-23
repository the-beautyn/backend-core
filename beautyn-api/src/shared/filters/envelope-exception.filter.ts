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
    const request = ctx.getRequest();

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
    const body: any = {
      success: false,
      data: payload,
    };

    // Controlled by env flag: ERROR_DETAILS_ENABLED = true|1|yes
    const flag = (process.env.ERROR_DETAILS_ENABLED || '').toLowerCase();
    const expose = flag === 'true' || flag === '1' || flag === 'yes' || flag === 'y';
    if (expose) {
      body.debug = {
        status,
        method: request?.method,
        url: request?.originalUrl || request?.url,
        // keep message minimal if payload is object/array
        message:
          typeof payload === 'string'
            ? payload
            : (payload?.message ?? undefined),
        stack: (exception as any)?.stack,
      };
    }
    response.status(status).json(body);
  }
}


