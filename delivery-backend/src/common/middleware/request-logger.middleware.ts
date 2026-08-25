import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = randomUUID();
    const { method, originalUrl } = req;
    const startTime = Date.now();

    // Agrega el requestId al objeto req para que otros componentes lo usen
    (req as any).requestId = requestId;

    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;

      this.logger.log(
        `[${requestId}] ${method} ${originalUrl} → ${statusCode} (${responseTime}ms)`,
      );
    });

    next();
  }
}
