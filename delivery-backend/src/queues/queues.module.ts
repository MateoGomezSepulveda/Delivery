import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { QueuesService } from './queues.service';
import { NotificationsProcessor } from './notifications.processor';

const isTestEnv = process.env.NODE_ENV === 'test';

@Global()
@Module({
  imports: [
    MailModule,
    NotificationsModule,
    ...(isTestEnv
      ? []
      : [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
              const redisUrl =
                configService.get<string>('REDIS_URL') ||
                'redis://localhost:6379';
              const parsed = new URL(redisUrl);
              return {
                connection: {
                  host: parsed.hostname || 'localhost',
                  port: Number(parsed.port) || 6379,
                  password: parsed.password || undefined,
                  maxRetriesPerRequest: null,
                  lazyConnect: true,
                },
              };
            },
          }),
          BullModule.registerQueue({
            name: 'notifications',
          }),
        ]),
  ],
  providers: isTestEnv
    ? [QueuesService]
    : [QueuesService, NotificationsProcessor],
  exports: [QueuesService],
})
export class QueuesModule {}
