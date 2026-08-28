import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from '../orders/schemas/order.schema';
import { OrderStatus } from '../orders/order-status.enum';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private client: MercadoPagoConfig;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
  ) {
    const accessToken = this.configService.get<string>(
      'MERCADOPAGO_ACCESS_TOKEN',
    );
    if (accessToken) {
      this.client = new MercadoPagoConfig({
        accessToken,
        options: { timeout: 5000 },
      });
    } else {
      this.logger.warn('MERCADOPAGO_ACCESS_TOKEN is not defined');
    }
  }

  async createPreference(order: Order, orderId: string): Promise<string> {
    try {
      if (!this.client) {
        throw new InternalServerErrorException('MercadoPago is not configured');
      }

      const preference = new Preference(this.client);

      const items = order.items.map((item) => ({
        id: item.productId.toString(),
        title: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        currency_id: 'COP', // Replace with your currency if different
      }));

      const appUrl =
        this.configService.get<string>('APP_URL') || 'http://localhost:3000';

      const result = await preference.create({
        body: {
          items,
          external_reference: orderId, // We use this to link the webhook back to the order
          back_urls: {
            success: `${appUrl}/api/v1/payments/success`,
            failure: `${appUrl}/api/v1/payments/failure`,
            pending: `${appUrl}/api/v1/payments/pending`,
          },
          auto_return: 'approved',
          notification_url: `${appUrl}/api/v1/payments/webhook`,
        },
      });

      return result.init_point!;
    } catch (error) {
      this.logger.error('Error creating MercadoPago preference', error);
      throw new InternalServerErrorException(
        'Error al inicializar el pago con MercadoPago',
      );
    }
  }

  async verifyPayment(
    paymentId: string,
  ): Promise<{ orderId: string; status: OrderStatus; mpStatus: string }> {
    try {
      if (!this.client) {
        throw new InternalServerErrorException('MercadoPago is not configured');
      }

      const payment = new Payment(this.client);
      const result = await payment.get({ id: paymentId });

      const orderId = result.external_reference;
      if (!orderId) {
        throw new Error('Payment does not have an external_reference');
      }

      let newStatus: OrderStatus = OrderStatus.PENDING;

      switch (result.status) {
        case 'approved':
          newStatus = OrderStatus.PAID;
          break;
        case 'rejected':
        case 'cancelled':
          newStatus = OrderStatus.FAILED;
          break;
        case 'in_process':
        case 'pending':
          newStatus = OrderStatus.PENDING;
          break;
        default:
          newStatus = OrderStatus.PENDING;
      }

      // Update the database!
      const updatedOrder = await this.orderModel
        .findByIdAndUpdate(
          orderId,
          { status: newStatus, paymentId: result.id?.toString() },
          { new: true },
        )
        .exec();

      if (!updatedOrder) {
        throw new Error(
          `Order ${orderId} not found in database to update payment status`,
        );
      }

      return {
        orderId,
        status: newStatus,
        mpStatus: result.status!,
      };
    } catch (error) {
      this.logger.error(`Error verifying payment ${paymentId}`, error);
      throw new InternalServerErrorException(
        'Error verificando pago en MercadoPago',
      );
    }
  }
}
