import {
  BadRequestException,
  Injectable,
  NotFoundException,
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
  ) {}

  async createOrder(userId: string, address: string) {
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

    const order = new this.orderModel({
      userId,
      items: orderItems,
      total: cart.total,
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
    return order.save();
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

    // Enviar notificaciones
    try {
      const user = await this.usersService.findOne(order.userId.toString());
      if (user) {
        // Enviar Email
        await this.mailService.sendOrderStatusEmail(user.email, orderId, status);
        
        // Enviar Push FCM
        if (user.fcmTokens && user.fcmTokens.length > 0) {
          await this.notificationsService.sendOrderStatusPush(user.fcmTokens, orderId, status);
        }
      }
    } catch (error) {
      // No bloqueamos la actualización de la orden si falla la notificación
      console.error('Error enviando notificaciones', error);
    }

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
