import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { QueuesService } from './queues.service';
import { NotificationsProcessor } from './notifications.processor';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('QueuesService & NotificationsProcessor', () => {
  let queuesService: QueuesService;
  let processor: NotificationsProcessor;

  const mockQueue = {
    add: jest.fn(),
  };

  const mockMailService = {
    sendOrderStatusEmail: jest.fn().mockResolvedValue(true),
  };

  const mockNotificationsService = {
    sendOrderStatusPush: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueuesService,
        NotificationsProcessor,
        { provide: getQueueToken('notifications'), useValue: mockQueue },
        { provide: MailService, useValue: mockMailService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    queuesService = module.get<QueuesService>(QueuesService);
    processor = module.get<NotificationsProcessor>(NotificationsProcessor);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(queuesService).toBeDefined();
    expect(processor).toBeDefined();
  });

  describe('QueuesService.enqueueOrderStatusNotification', () => {
    it('debe encolar el trabajo en BullMQ con reintentos exponenciales', async () => {
      mockQueue.add.mockResolvedValueOnce({ id: 'job-1' });

      const payload = {
        email: 'user@test.com',
        fcmTokens: ['token-1'],
        orderId: 'order-123',
        status: 'DELIVERED',
      };

      const result =
        await queuesService.enqueueOrderStatusNotification(payload);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-order-status',
        payload,
        expect.objectContaining({
          attempts: 3,
          removeOnComplete: true,
        }),
      );
      expect(result).toEqual({ queued: true });
    });

    it('debe usar el fallback directo si BullMQ lanza un error de conexión', async () => {
      mockQueue.add.mockRejectedValueOnce(new Error('Redis offline'));

      const payload = {
        email: 'user@test.com',
        fcmTokens: ['token-1'],
        orderId: 'order-123',
        status: 'CONFIRMED',
      };

      const result =
        await queuesService.enqueueOrderStatusNotification(payload);

      expect(result).toEqual({ queued: false });
      expect(mockMailService.sendOrderStatusEmail).toHaveBeenCalledWith(
        'user@test.com',
        'order-123',
        'CONFIRMED',
      );
      expect(mockNotificationsService.sendOrderStatusPush).toHaveBeenCalledWith(
        ['token-1'],
        'order-123',
        'CONFIRMED',
      );
    });
  });

  describe('NotificationsProcessor.process', () => {
    it('debe procesar el job enviando email y push notification', async () => {
      const mockJob = {
        id: '1',
        name: 'send-order-status',
        data: {
          email: 'cliente@test.com',
          fcmTokens: ['fcm-abc'],
          orderId: 'order-999',
          status: 'OUT_FOR_DELIVERY',
        },
      } as any;

      await processor.process(mockJob);

      expect(mockMailService.sendOrderStatusEmail).toHaveBeenCalledWith(
        'cliente@test.com',
        'order-999',
        'OUT_FOR_DELIVERY',
      );
      expect(mockNotificationsService.sendOrderStatusPush).toHaveBeenCalledWith(
        ['fcm-abc'],
        'order-999',
        'OUT_FOR_DELIVERY',
      );
    });
  });
});
