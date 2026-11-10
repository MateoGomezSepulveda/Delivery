import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderNotificationJobData } from './notifications.processor';

@Injectable()
export class QueuesService {
  private readonly logger = new Logger(QueuesService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
    @Optional()
    @InjectQueue('notifications')
    private readonly notificationsQueue?: Queue,
  ) {}

  async enqueueOrderStatusNotification(
    data: OrderNotificationJobData,
  ): Promise<{ queued: boolean }> {
    if (this.notificationsQueue) {
      try {
        await this.notificationsQueue.add('send-order-status', data, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
        });
        this.logger.log(
          `Notificación encolada en BullMQ para la orden ${data.orderId}`,
        );
        return { queued: true };
      } catch (error) {
        this.logger.warn(
          `BullMQ no disponible (${(error as Error).message}), ejecutando envío directo como fallback.`,
        );
      }
    }

    // Fallback directo (por ejemplo en entorno de test sin Redis)
    if (data.email) {
      await this.mailService.sendOrderStatusEmail(
        data.email,
        data.orderId,
        data.status,
      );
    }
    if (data.fcmTokens && data.fcmTokens.length > 0) {
      await this.notificationsService.sendOrderStatusPush(
        data.fcmTokens,
        data.orderId,
        data.status,
      );
    }
    return { queued: false };
  }
}
