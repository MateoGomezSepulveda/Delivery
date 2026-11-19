import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { Model } from 'mongoose';
import { CartService } from 'src/cart/cart.service';
import { PaymentsService } from 'src/payments/payments.service';
import { OrderStatus } from './order-status.enum';
import { OrderPaginationDto } from './dto/order-pagination.dto';

import { MailService } from 'src/mail/mail.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { UsersService } from 'src/users/users.service';
import { CouponsService } from 'src/coupons/coupons.service';
import { EventsGateway } from '../events/events/events.gateway';
import { QueuesService } from '../queues/queues.service';

export const RIDER_MONTHLY_DISCOUNT_LIMIT = 4;
export const RIDER_DISCOUNT_PERCENT = 10;

const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.OUT_FOR_DELIVERY],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.FAILED]: [OrderStatus.PENDING, OrderStatus.CANCELLED],
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private cartService: CartService,
    private paymentsService: PaymentsService,
    private usersService: UsersService,
    private mailService: MailService,
    private notificationsService: NotificationsService,
    private eventsGateway: EventsGateway,
    @Optional() private queuesService?: QueuesService,
    @Optional() private couponsService?: CouponsService,
  ) {}

  async getRiderDiscountQuota(userId: string) {
    const base = {
      eligible: false,
      isRider: false,
      monthlyLimit: RIDER_MONTHLY_DISCOUNT_LIMIT,
      usedThisMonth: 0,
      remaining: 0,
      discountPercent: RIDER_DISCOUNT_PERCENT,
    };

    try {
      const user = await this.usersService.findOne(userId);
      if (user?.role !== 'DELIVERY') {
        return base;
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const usedThisMonth =
        (await this.orderModel.countDocuments({
          userId,
          createdAt: { $gte: startOfMonth },
          status: { $ne: OrderStatus.CANCELLED },
        })) ?? 0;

      const remaining = Math.max(
        0,
        RIDER_MONTHLY_DISCOUNT_LIMIT - usedThisMonth,
      );

      return {
        eligible: remaining > 0,
        isRider: true,
        monthlyLimit: RIDER_MONTHLY_DISCOUNT_LIMIT,
        usedThisMonth,
        remaining,
        discountPercent: RIDER_DISCOUNT_PERCENT,
      };
    } catch {
      return base;
    }
  }

  async createOrder(userId: string, address: string, couponCode?: string) {
    const cart = await this.cartService.getActiveCart(userId);

    if (!cart.items.length) {
      throw new BadRequestException('Cart is empty');
    }

    const orderItems = cart.items.map((item: any) => ({
      productId: item.productId._id || item.productId,
      name: item.productId.name || 'Producto',
      quantity: item.quantity,
      price: item.price,
    }));

    // Beneficio Socio Repartidor: 10% de descuento en los primeros 4 pedidos del mes
    const subtotal = cart.total;
    const riderQuota = await this.getRiderDiscountQuota(userId);
    const riderDiscount = riderQuota.eligible
      ? Math.round(subtotal * (RIDER_DISCOUNT_PERCENT / 100))
      : 0;

    // Cupón promocional real: se valida y redime en el backend antes de cerrar el carrito
    let appliedCouponCode: string | null = null;
    let couponDiscount = 0;
    const normalizedCouponCode = couponCode?.trim();

    if (normalizedCouponCode && this.couponsService) {
      const redeemed = await this.couponsService.redeemCoupon(
        userId,
        normalizedCouponCode,
        subtotal,
      );
      appliedCouponCode = redeemed.code;
      couponDiscount = redeemed.discountAmount;
    }

    const finalTotal = Math.max(
      0,
      Math.round(subtotal - riderDiscount - couponDiscount),
    );

    const order = new this.orderModel({
      userId,
      items: orderItems,
      subtotal,
      riderDiscount,
      couponCode: appliedCouponCode,
      couponDiscount,
      total: finalTotal,
      address,
    });

    cart.status = 'CHECKED_OUT';
    await cart.save();

    await this.cartService.getActiveCart(userId);

    return order.save();
  }

  async findMyOrders(userId: string, paginationDto: OrderPaginationDto) {
    const { page = 1, limit = 10, status, dateFrom, dateTo } = paginationDto;
    const skip = (page - 1) * limit;

    const filter: any = { userId };

    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const orders = await this.orderModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate('items.productId');

    const total = await this.orderModel.countDocuments(filter);

    return {
      data: orders,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findAllOrders(paginationDto: OrderPaginationDto) {
    const { page = 1, limit = 10, status, dateFrom, dateTo } = paginationDto;

    const skip = (page - 1) * limit;

    const filter: any = {};

    if (status) filter.status = status;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const orders = await this.orderModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate('items.productId')
      .populate('userId');

    const total = await this.orderModel.countDocuments(filter);

    return {
      data: orders,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(orderId: string, user: any) {
    const order = await this.orderModel
      .findById(orderId)
      .populate('items.productId')
      .populate('userId', '-password');

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const orderUserId = ((order.userId as any)?._id ?? order.userId).toString();

    if (user.role !== 'ADMIN' && orderUserId !== user.userId) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async cancelOrderByClient(orderId: string, userId: string) {
    const order = await this.orderModel.findById(orderId);

    if (!order) throw new NotFoundException('Order not found');

    if (order.userId.toString() !== userId) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Solo se pueden cancelar pedidos en estado PENDING',
      );
    }
    order.status = OrderStatus.CANCELLED;
    const saved = await order.save();

    if (order.couponCode && this.couponsService) {
      try {
        await this.couponsService.releaseCoupon(userId, order.couponCode);
      } catch {
        // No bloqueamos la cancelación si no se pudo liberar el cupón
      }
    }

    return saved;
  }

  async updateStatus(orderId: string, status: OrderStatus) {
    const order = await this.orderModel.findById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const currentStatus = order.status;

    const allowedTransitions = validTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(status)) {
      throw new BadRequestException(
        `Cannot change status from ${currentStatus} to ${status}`,
      );
    }

    order.status = status;
    const savedOrder = await order.save();

    // Enviar notificaciones (vía cola BullMQ si está disponible, o directo)
    try {
      const user = await this.usersService.findOne(order.userId.toString());
      if (user) {
        if (this.queuesService) {
          await this.queuesService.enqueueOrderStatusNotification({
            email: user.email,
            fcmTokens: user.fcmTokens,
            orderId,
            status,
          });
        } else {
          await this.mailService.sendOrderStatusEmail(
            user.email,
            orderId,
            status,
          );
          if (user.fcmTokens && user.fcmTokens.length > 0) {
            await this.notificationsService.sendOrderStatusPush(
              user.fcmTokens,
              orderId,
              status,
            );
          }
        }
      }
    } catch (error) {
      // No bloqueamos la actualización de la orden si falla la notificación
      console.error('Error enviando notificaciones', error);
    }

    // Emitir evento para actualizacion en tiempo real
    this.eventsGateway.emitOrderStatusUpdate(
      savedOrder.userId.toString(),
      savedOrder,
    );

    return savedOrder;
  }

  async payOrder(orderId: string, userId: string) {
    const order = await this.findOne(orderId, { userId, role: 'USER' });

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.FAILED
    ) {
      throw new BadRequestException(
        'Solo se pueden pagar pedidos en estado PENDING o FAILED',
      );
    }

    const paymentUrl = await this.paymentsService.createPreference(
      order,
      orderId,
    );

    order.paymentUrl = paymentUrl;
    await order.save();

    return { paymentUrl };
  }
}
