import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception.getStatus();
    const error = exception.getResponse();

    response.status(status).json({
      success: false,
      requestId: randomUUID(),
      statusCode: status,
      path: request.url,
      method: request.method,
      error,
      timestamp: new Date().toISOString(),

    });
  }
}
