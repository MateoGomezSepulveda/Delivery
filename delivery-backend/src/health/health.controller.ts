import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator, MongooseHealthIndicator } from '@nestjs/terminus';
import { Public } from 'src/auth/public.decorator';

@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private db: MongooseHealthIndicator,
        private memory: MemoryHealthIndicator

    ) { }

    @Public()
    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
            // revisa el mongoose este conectado y respondiendo
            () => this.db.pingCheck('mongodb'),
            // revisa que la aplicacion no se este tragando toda la memoria RMA (Limite: 150MB)
            () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
        ]);
    }
}