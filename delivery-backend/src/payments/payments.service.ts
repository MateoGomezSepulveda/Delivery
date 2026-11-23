import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { OrderStatus } from '../orders/order-status.enum';
import { PaymentStatus } from '../orders/payment-method.enum';
import { EventsGateway } from '../events/events/events.gateway';

const POST_PAYMENT_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private client: MercadoPagoConfig | null = null;
  private isSandboxToken = false;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @Optional() private readonly eventsGateway?: EventsGateway,
  ) {
    const accessToken = this.configService.get<string>(
      'MERCADOPAGO_ACCESS_TOKEN',
    );
    if (accessToken?.trim()) {
      this.isSandboxToken = accessToken.trim().startsWith('TEST-');
      this.client = new MercadoPagoConfig({
        accessToken: accessToken.trim(),
        options: { timeout: 8000 },
      });
    } else {
      this.logger.warn('MERCADOPAGO_ACCESS_TOKEN is not defined');
    }
  }

  private isPublicHttpsUrl(url?: string): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      const isLocalHost =
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname === '0.0.0.0';
      return parsed.protocol === 'https:' && !isLocalHost;
    } catch {
      return false;
    }
  }

  async createPreference(order: Order, orderId: string): Promise<string> {
    if (!this.client) {
      throw new InternalServerErrorException('MercadoPago is not configured');
    }

    try {
      const preference = new Preference(this.client);

      const itemsSubtotal = order.items.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0,
      );
      const hasDiscount =
        typeof order.total === 'number' &&
        order.total >= 0 &&
        order.total < itemsSubtotal;

      const items = hasDiscount
        ? [
            {
              id: orderId,
              title: `Pedido DeliveryPro #${orderId.slice(-6).toUpperCase()}${order.couponCode ? ` (Cupón ${order.couponCode})` : ''}`,
              quantity: 1,
              unit_price: Math.max(1, Number(order.total)),
              currency_id: 'COP',
            },
          ]
        : order.items.map((item) => ({
            id: item.productId.toString(),
            title: item.name,
            quantity: item.quantity,
            unit_price: Math.max(1, Number(item.price)),
            currency_id: 'COP',
          }));

      const appUrl = (
        this.configService.get<string>('APP_URL') || 'http://localhost:3000'
      ).replace(/\/+$/, '');
      const webhookBaseUrl = (
        this.configService.get<string>('MERCADOPAGO_WEBHOOK_URL') || appUrl
      ).replace(/\/+$/, '');

      const backUrls = {
        success: `${appUrl}/api/v1/payments/success`,
        failure: `${appUrl}/api/v1/payments/failure`,
        pending: `${appUrl}/api/v1/payments/pending`,
      };

      const body: Record<string, any> = {
        items,
        external_reference: orderId,
        back_urls: backUrls,
      };

      // MercadoPago rechaza auto_return y notification_url cuando apuntan a http://localhost
      if (this.isPublicHttpsUrl(backUrls.success)) {
        body.auto_return = 'approved';
      }
      if (this.isPublicHttpsUrl(webhookBaseUrl)) {
        body.notification_url = `${webhookBaseUrl}/api/v1/payments/webhook`;
      }

      const result = await preference.create({ body: body as any });

      const checkoutUrl = this.isSandboxToken
        ? result.sandbox_init_point || result.init_point
        : result.init_point || result.sandbox_init_point;

      if (!checkoutUrl) {
        throw new Error('MercadoPago no devolvió URL de pago');
      }

      return checkoutUrl;
    } catch (error) {
      this.logger.error('Error creating MercadoPago preference', error);
      throw new InternalServerErrorException(
        'Error al inicializar el pago con MercadoPago',
      );
    }
  }

  async verifyPayment(
    paymentId: string,
    expectedOrderId?: string,
  ): Promise<{
    orderId: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    mpStatus: string;
    order: OrderDocument;
  }> {
    if (!this.client) {
      throw new InternalServerErrorException('MercadoPago is not configured');
    }

    try {
      const payment = new Payment(this.client);
      const result = await payment.get({ id: paymentId });

      const orderId = result.external_reference;
      if (!orderId) {
        throw new BadRequestException(
          'El pago en MercadoPago no tiene una orden asociada (external_reference).',
        );
      }

      if (expectedOrderId && orderId !== expectedOrderId) {
        throw new BadRequestException(
          'El ID de pago proporcionado no corresponde a esta orden.',
        );
      }

      const existingOrder = await this.orderModel.findById(orderId).exec();
      if (!existingOrder) {
        throw new BadRequestException(
          `Orden ${orderId} no encontrada para actualizar el pago.`,
        );
      }

      let newOrderStatus: OrderStatus = OrderStatus.PENDING;
      let newPaymentStatus: PaymentStatus = PaymentStatus.PENDING;

      switch (result.status) {
        case 'approved':
          newOrderStatus = OrderStatus.PAID;
          newPaymentStatus = PaymentStatus.PAID;
          break;
        case 'rejected':
        case 'cancelled':
          newOrderStatus = OrderStatus.FAILED;
          newPaymentStatus = PaymentStatus.FAILED;
          break;
        case 'in_process':
        case 'pending':
        default:
          newOrderStatus = OrderStatus.PENDING;
          newPaymentStatus = PaymentStatus.PENDING;
      }

      // Idempotencia: no retrocedemos una orden que ya avanzó después del pago
      if (POST_PAYMENT_STATUSES.includes(existingOrder.status)) {
        return {
          orderId,
          status: existingOrder.status,
          paymentStatus: existingOrder.paymentStatus ?? PaymentStatus.PAID,
          mpStatus: result.status || 'unknown',
          order: existingOrder,
        };
      }

      const updatePayload: Record<string, any> = {
        status: newOrderStatus,
        paymentStatus: newPaymentStatus,
        paymentId: result.id?.toString() || paymentId,
      };
      if (newPaymentStatus === PaymentStatus.PAID) {
        updatePayload.paidAt = existingOrder.paidAt ?? new Date();
      }

      const updatedOrder = await this.orderModel
        .findByIdAndUpdate(orderId, updatePayload, { new: true })
        .exec();

      if (!updatedOrder) {
        throw new BadRequestException(
          `Orden ${orderId} no encontrada al guardar el estado del pago.`,
        );
      }

      this.eventsGateway?.emitOrderStatusUpdate(
        updatedOrder.userId.toString(),
        updatedOrder,
      );

      return {
        orderId,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
        mpStatus: result.status || 'unknown',
        order: updatedOrder,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error verifying payment ${paymentId}`, error);
      throw new InternalServerErrorException(
        'Error verificando pago en MercadoPago',
      );
    }
  }
}
