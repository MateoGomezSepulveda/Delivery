import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
    private readonly logger = new Logger('AuditLog');

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url, ip } = request;
        const userId = request.user?._id ?? 'anónimo';
        const now = Date.now();

        return next.handle().pipe(
            tap(() => {
                const ms = Date.now() - now;
                this.logger.log(
                    `[${method}] ${url} | usuario: ${userId} | IP: ${ip} | ${ms}ms`,
                );
            }),
        );
    }
}
