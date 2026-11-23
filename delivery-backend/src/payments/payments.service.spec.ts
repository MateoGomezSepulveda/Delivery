import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Order } from '../orders/schemas/order.schema';
import { OrderStatus } from '../orders/order-status.enum';
import { PaymentStatus } from '../orders/payment-method.enum';
import { EventsGateway } from '../events/events/events.gateway';

const mockPreferenceCreate = jest.fn();
const mockPaymentGet = jest.fn();

jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn().mockImplementation(() => ({})),
  Preference: jest.fn().mockImplementation(() => ({
    create: mockPreferenceCreate,
  })),
  Payment: jest.fn().mockImplementation(() => ({
    get: mockPaymentGet,
  })),
}));

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockOrderModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockEventsGateway = {
    emitOrderStatusUpdate: jest.fn(),
  };

  const buildModule = async (env: Record<string, string | undefined>) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => env[key]),
          },
        },
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();

    return module.get<PaymentsService>(PaymentsService);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    service = await buildModule({
      MERCADOPAGO_ACCESS_TOKEN: 'TEST-1234567890',
      APP_URL: 'http://localhost:3000',
    });
  });

  describe('createPreference', () => {
    const sampleOrder: any = {
      items: [
        {
          productId: 'prod-1',
          name: 'Whisky Old Parr 750ml',
          quantity: 1,
          price: 120000,
        },
      ],
      total: 120000,
    };

    it('omite auto_return y notification_url en localhost y usa sandbox_init_point con token TEST-', async () => {
      mockPreferenceCreate.mockResolvedValueOnce({
        init_point: 'https://www.mercadopago.com.co/checkout/v1/redirect?id=1',
        sandbox_init_point:
          'https://sandbox.mercadopago.com.co/checkout/v1/redirect?id=1',
      });

      const url = await service.createPreference(sampleOrder, 'order-123');

      expect(url).toBe(
        'https://sandbox.mercadopago.com.co/checkout/v1/redirect?id=1',
      );
      const sentBody = mockPreferenceCreate.mock.calls[0][0].body;
      expect(sentBody.external_reference).toBe('order-123');
      expect(sentBody.auto_return).toBeUndefined();
      expect(sentBody.notification_url).toBeUndefined();
    });

    it('incluye auto_return y notification_url cuando APP_URL es HTTPS pública y usa init_point en producción', async () => {
      service = await buildModule({
        MERCADOPAGO_ACCESS_TOKEN: 'APP_USR-99999999',
        APP_URL: 'https://api.deliverypro.co',
      });
      mockPreferenceCreate.mockResolvedValueOnce({
        init_point: 'https://www.mercadopago.com.co/checkout/v1/redirect?id=2',
        sandbox_init_point:
          'https://sandbox.mercadopago.com.co/checkout/v1/redirect?id=2',
      });

      const url = await service.createPreference(sampleOrder, 'order-999');

      expect(url).toBe(
        'https://www.mercadopago.com.co/checkout/v1/redirect?id=2',
      );
      const sentBody = mockPreferenceCreate.mock.calls[0][0].body;
      expect(sentBody.auto_return).toBe('approved');
      expect(sentBody.notification_url).toBe(
        'https://api.deliverypro.co/api/v1/payments/webhook',
      );
    });

    it('incluye un ítem de Costo de domicilio cuando la orden tiene deliveryFee sin descuentos', async () => {
      mockPreferenceCreate.mockResolvedValueOnce({
        sandbox_init_point:
          'https://sandbox.mercadopago.com.co/checkout/v1/redirect?id=3',
      });

      const orderWithFee: any = {
        ...sampleOrder,
        deliveryFee: 5000,
        total: 125000,
      };

      await service.createPreference(orderWithFee, 'order-fee-1');

      const sentBody = mockPreferenceCreate.mock.calls[0][0].body;
      expect(sentBody.items).toHaveLength(2);
      expect(sentBody.items[1]).toEqual(
        expect.objectContaining({
          id: 'delivery-fee',
          title: 'Costo de domicilio',
          quantity: 1,
          unit_price: 5000,
          currency_id: 'COP',
        }),
      );
    });

    it('cobra el total exacto (productos - descuento + domicilio) cuando hay cupón aplicado', async () => {
      mockPreferenceCreate.mockResolvedValueOnce({
        sandbox_init_point:
          'https://sandbox.mercadopago.com.co/checkout/v1/redirect?id=4',
      });

      const discountedOrderWithFee: any = {
        ...sampleOrder,
        couponCode: 'PROMO10',
        couponDiscount: 12000,
        deliveryFee: 5000,
        total: 113000,
      };

      await service.createPreference(discountedOrderWithFee, 'order-fee-2');

      const sentBody = mockPreferenceCreate.mock.calls[0][0].body;
      expect(sentBody.items).toHaveLength(1);
      expect(sentBody.items[0].unit_price).toBe(113000);
      expect(sentBody.items[0].title).toContain('Cupón PROMO10');
    });

    it('lanza InternalServerErrorException si MercadoPago no está configurado', async () => {
      service = await buildModule({});
      await expect(
        service.createPreference(sampleOrder, 'order-123'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('verifyPayment', () => {
    it('aprueba la orden, actualiza paymentStatus a PAID y emite evento WebSocket', async () => {
      mockPaymentGet.mockResolvedValueOnce({
        id: 777888,
        status: 'approved',
        external_reference: 'order-1',
      });
      mockOrderModel.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          _id: 'order-1',
          userId: 'user-1',
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
        }),
      });
      const updatedDoc = {
        _id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.PAID,
        paymentId: '777888',
      };
      mockOrderModel.findByIdAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(updatedDoc),
      });

      const res = await service.verifyPayment('777888', 'order-1');

      expect(res.status).toBe(OrderStatus.PAID);
      expect(res.paymentStatus).toBe(PaymentStatus.PAID);
      expect(mockEventsGateway.emitOrderStatusUpdate).toHaveBeenCalledWith(
        'user-1',
        updatedDoc,
      );
    });

    it('rechaza con BadRequestException si external_reference no coincide con expectedOrderId (anti-fraude)', async () => {
      mockPaymentGet.mockResolvedValueOnce({
        id: 777888,
        status: 'approved',
        external_reference: 'otra-orden',
      });

      await expect(
        service.verifyPayment('777888', 'mi-orden'),
      ).rejects.toThrow(BadRequestException);
      expect(mockOrderModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('mantiene idempotencia y no retrocede una orden que ya fue confirmada o entregada', async () => {
      mockPaymentGet.mockResolvedValueOnce({
        id: 777888,
        status: 'approved',
        external_reference: 'order-1',
      });
      mockOrderModel.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          _id: 'order-1',
          userId: 'user-1',
          status: OrderStatus.PREPARING,
          paymentStatus: PaymentStatus.PAID,
        }),
      });

      const res = await service.verifyPayment('777888');

      expect(res.status).toBe(OrderStatus.PREPARING);
      expect(mockOrderModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });
});
