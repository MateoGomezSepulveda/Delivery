import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface OrderNotificationJobData {
  email: string;
  fcmTokens?: string[];
  orderId: string;
  status: string;
}

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<OrderNotificationJobData>): Promise<void> {
    const { email, fcmTokens, orderId, status } = job.data;
    this.logger.log(
      `Procesando job [${job.name}#${job.id}] para orden ${orderId} -> ${status}`,
    );

    if (email) {
      await this.mailService.sendOrderStatusEmail(email, orderId, status);
    }

    if (fcmTokens && fcmTokens.length > 0) {
      await this.notificationsService.sendOrderStatusPush(
        fcmTokens,
        orderId,
        status,
      );
    }
  }
}
