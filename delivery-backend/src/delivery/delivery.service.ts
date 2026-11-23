import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DeliveryProfile,
  DeliveryProfileDocument,
  DeliveryProfileStatus,
} from './schemas/delivery-profile.schema';
import { Order, OrderDocument } from 'src/orders/schemas/order.schema';
import { OrderStatus } from 'src/orders/order-status.enum';
import {
  PaymentMethod,
  PaymentStatus,
} from 'src/orders/payment-method.enum';
import { CreateDeliveryProfileDto } from './dto/create-delivery-profile.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { EventsGateway } from '../events/events/events.gateway';
import { UsersService } from 'src/users/users.service';
import { Role } from 'src/auth/roles.enum';

export const RIDER_COMMISSION_RATE = 0.1;
export const RIDER_MIN_EARNING_PER_DELIVERY = 5000;

export function calculateRiderEarning(orderTotal: number): number {
  const safeTotal = Number.isFinite(orderTotal) ? Math.max(0, orderTotal) : 0;
  return Math.max(
    RIDER_MIN_EARNING_PER_DELIVERY,
    Math.round(safeTotal * RIDER_COMMISSION_RATE),
  );
}

@Injectable()
export class DeliveryService implements OnModuleInit {
  constructor(
    @InjectModel(DeliveryProfile.name)
    private deliveryProfileModel: Model<DeliveryProfileDocument>,
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    private eventsGateway: EventsGateway,
    @Optional() private usersService?: UsersService,
  ) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    try {
      // Perfiles creados antes del flujo de aprobación pasan como APPROVED para no bloquear riders existentes
      await this.deliveryProfileModel.updateMany(
        { status: { $exists: false } },
        { $set: { status: DeliveryProfileStatus.APPROVED } },
      );
    } catch {
      // Ignorar si la colección aún no está lista
    }
  }

  /**
   * Crear solicitud de repartidor en estado PENDING (requiere aprobación de ADMIN para promover a DELIVERY).
   * Si el usuario ya tiene rol DELIVERY (asignado por Admin), su perfil nace APPROVED.
   * Si tenía una solicitud REJECTED, le permite volver a postularse.
   */
  async createProfile(userId: string, dto: CreateDeliveryProfileDto) {
    const existing = await this.deliveryProfileModel.findOne({ userId });
    const normalizedPlate =
      (dto.licensePlate ?? dto.plate ?? '').trim() || undefined;

    const user = this.usersService
      ? await this.usersService.findOne(userId)
      : null;
    const normalizedPhone = dto.phone?.trim() || user?.phone || undefined;

    if (existing) {
      if (existing.status === DeliveryProfileStatus.REJECTED) {
        existing.vehicleType = dto.vehicleType;
        existing.plate = normalizedPlate;
        existing.licensePlate = normalizedPlate;
        existing.phone = normalizedPhone;
        existing.status = DeliveryProfileStatus.PENDING;
        existing.rejectionReason = undefined;
        existing.isAvailable = false;
        return existing.save();
      }
      throw new ConflictException(
        'Ya tienes una solicitud o perfil de repartidor registrado.',
      );
    }

    const initialStatus =
      user?.role === Role.DELIVERY
        ? DeliveryProfileStatus.APPROVED
        : DeliveryProfileStatus.PENDING;

    return this.deliveryProfileModel.create({
      vehicleType: dto.vehicleType,
      plate: normalizedPlate,
      licensePlate: normalizedPlate,
      phone: normalizedPhone,
      status: initialStatus,
      isAvailable: false,
      userId,
    });
  }

  // Listar solicitudes / perfiles de repartidor (Admin)
  async listProfiles(status?: string) {
    const filter: Record<string, unknown> = {};
    if (
      status &&
      Object.values(DeliveryProfileStatus).includes(
        status as DeliveryProfileStatus,
      )
    ) {
      filter.status = status;
    }

    return this.deliveryProfileModel
      .find(filter)
      .populate('userId', 'name email phone role avatarUrl isEmailVerified')
      .sort({ createdAt: -1 });
  }

  // Aprobar o rechazar solicitud de repartidor (Admin)
  async reviewProfileStatus(
    profileId: string,
    status: DeliveryProfileStatus.APPROVED | DeliveryProfileStatus.REJECTED,
    rejectionReason?: string,
  ) {
    const profile = await this.deliveryProfileModel.findById(profileId);
    if (!profile) {
      throw new NotFoundException('Solicitud de repartidor no encontrada.');
    }

    profile.status = status;
    profile.reviewedAt = new Date();

    const targetUserId = profile.userId.toString();

    if (status === DeliveryProfileStatus.APPROVED) {
      profile.rejectionReason = undefined;
      if (this.usersService) {
        const user = await this.usersService.findOne(targetUserId);
        if (user && user.role === Role.CLIENT) {
          await this.usersService.changeRole(targetUserId, Role.DELIVERY);
        }
      }
    } else {
      profile.isAvailable = false;
      profile.rejectionReason = rejectionReason?.trim() || undefined;
      if (this.usersService) {
        const user = await this.usersService.findOne(targetUserId);
        if (user && user.role === Role.DELIVERY) {
          await this.usersService.changeRole(targetUserId, Role.CLIENT);
        }
      }
    }

    await profile.save();

    const populated = await this.deliveryProfileModel
      .findById(profile._id)
      .populate('userId', 'name email phone role avatarUrl isEmailVerified');

    return populated ?? profile;
  }

  // Ver mi perfil o estado de solicitud
  async getMyProfile(userId: string) {
    const profile = await this.deliveryProfileModel.findOne({ userId });
    if (!profile)
      throw new NotFoundException('Perfil de repartidor no encontrado.');
    return profile;
  }

  // Actualizar disponibilidad (estoy trabajando hoy o no)
  async updateAvailability(userId: string, dto: UpdateAvailabilityDto) {
    const profile = await this.deliveryProfileModel.findOne({ userId });
    if (!profile) {
      throw new NotFoundException('Perfil de repartidor no encontrado.');
    }
    if (
      dto.isAvailable &&
      profile.status &&
      profile.status !== DeliveryProfileStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Tu solicitud de repartidor debe ser aprobada por un administrador antes de ponerte disponible.',
      );
    }

    return this.deliveryProfileModel.findOneAndUpdate(
      { userId },
      { isAvailable: dto.isAvailable },
      { new: true },
    );
  }

  // Actualizar ubicación GPS en tiempo real
  async updateLocation(userId: string, dto: UpdateLocationDto) {
    const profile = await this.deliveryProfileModel.findOneAndUpdate(
      { userId },
      { currentLocation: { lat: dto.lat, lng: dto.lng } },
      { new: true },
    );

    // Notificar en vivo a los clientes con pedidos en camino de este repartidor
    const activeOrders = await this.orderModel.find({
      deliveryId: userId,
      status: OrderStatus.OUT_FOR_DELIVERY,
    });
    for (const order of activeOrders) {
      this.eventsGateway.emitDeliveryLocationUpdate(order.userId.toString(), {
        orderId: order._id.toString(),
        lat: dto.lat,
        lng: dto.lng,
      });
    }

    return profile;
  }

  // Ver pedidos disponibles para recoger (estado PREPARING) incluyendo teléfono del cliente
  async getAvailableOrders() {
    return this.orderModel
      .find({ status: OrderStatus.PREPARING, deliveryId: null })
      .populate('userId', 'name email phone')
      .sort({ createdAt: 1 }); // El más antiguo primero
  }

  // Pedidos que el repartidor tiene actualmente en camino (incluyendo teléfono del cliente)
  async getActiveOrders(userId: string) {
    return this.orderModel
      .find({ deliveryId: userId, status: OrderStatus.OUT_FOR_DELIVERY })
      .populate('userId', 'name email phone')
      .sort({ updatedAt: -1 });
  }

  // Aceptar un pedido (valida que el repartidor esté aprobado y Disponible / Online)
  async acceptOrder(userId: string, orderId: string) {
    const profile = await this.deliveryProfileModel.findOne({ userId });
    if (!profile) {
      throw new BadRequestException(
        'Debes registrar tu perfil de repartidor antes de aceptar pedidos.',
      );
    }
    if (profile.status && profile.status !== DeliveryProfileStatus.APPROVED) {
      throw new BadRequestException(
        'Tu cuenta de repartidor aún está pendiente de aprobación por el administrador.',
      );
    }
    if (!profile.isAvailable) {
      throw new BadRequestException(
        'Debes activar tu estado a Disponible para aceptar pedidos',
      );
    }

    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Pedido no encontrado.');
    if (order.status !== OrderStatus.PREPARING)
      throw new BadRequestException(
        'Este pedido no está disponible para recoger.',
      );
    if (order.deliveryId)
      throw new BadRequestException(
        'Este pedido ya fue tomado por otro repartidor.',
      );

    const updated = await this.orderModel.findOneAndUpdate(
      { _id: orderId, status: OrderStatus.PREPARING, deliveryId: null },
      { deliveryId: userId, status: OrderStatus.OUT_FOR_DELIVERY },
      { new: true },
    );

    if (!updated) {
      throw new BadRequestException(
        'Este pedido ya fue tomado por otro repartidor.',
      );
    }

    this.eventsGateway.emitOrderStatusUpdate(
      updated.userId.toString(),
      updated,
    );
    this.eventsGateway.emitOrderTaken?.(updated._id.toString(), userId);

    return updated;
  }

  // Marcar pedido como entregado
  async deliverOrder(userId: string, orderId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Pedido no encontrado.');
    if (order.deliveryId?.toString() !== userId)
      throw new BadRequestException('Este pedido no te pertenece.');
    if (order.status !== OrderStatus.OUT_FOR_DELIVERY)
      throw new BadRequestException('Este pedido no está en camino.');

    const updateFields: Record<string, any> = {
      status: OrderStatus.DELIVERED,
    };
    if (order.paymentMethod === PaymentMethod.CASH_ON_DELIVERY) {
      updateFields.paymentStatus = PaymentStatus.PAID;
      updateFields.paidAt = order.paidAt ?? new Date();
    }

    const updated = await this.orderModel.findByIdAndUpdate(
      orderId,
      updateFields,
      { new: true },
    );
    if (updated) {
      this.eventsGateway.emitOrderStatusUpdate(
        updated.userId.toString(),
        updated,
      );
    }
    return updated;
  }

  // Mis estadísticas completas como repartidor (entregas, hoy, recaudado y ganancias estimadas)
  async getMyStats(userId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [deliveredOrders, inProgress] = await Promise.all([
      this.orderModel
        .find({
          deliveryId: userId,
          status: OrderStatus.DELIVERED,
        })
        .select('total updatedAt createdAt')
        .lean(),
      this.orderModel.countDocuments({
        deliveryId: userId,
        status: OrderStatus.OUT_FOR_DELIVERY,
      }),
    ]);

    const list = Array.isArray(deliveredOrders) ? deliveredOrders : [];
    const delivered = list.length;
    let deliveredToday = 0;
    let totalOrderValue = 0;
    let estimatedEarnings = 0;

    for (const order of list as Array<{
      total?: number;
      updatedAt?: Date;
      createdAt?: Date;
    }>) {
      const orderTotal = Number(order.total ?? 0);
      totalOrderValue += orderTotal;
      estimatedEarnings += calculateRiderEarning(orderTotal);
      const completedAt = order.updatedAt ?? order.createdAt;
      if (completedAt && new Date(completedAt) >= startOfToday) {
        deliveredToday += 1;
      }
    }

    return {
      delivered,
      inProgress,
      deliveredToday,
      totalOrderValue: Math.round(totalOrderValue),
      estimatedEarnings: Math.round(estimatedEarnings),
    };
  }

  // Historial paginado de entregas completadas del repartidor
  async getOrderHistory(userId: string, page = 1, limit = 10) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
    const skip = (safePage - 1) * safeLimit;

    const filter = {
      deliveryId: userId,
      status: OrderStatus.DELIVERED,
    };

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate('userId', 'name email phone')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      this.orderModel.countDocuments(filter),
    ]);

    const enriched = orders.map((order: any) => {
      const plain =
        typeof order.toObject === 'function' ? order.toObject() : order;
      return {
        ...plain,
        riderEarning: calculateRiderEarning(Number(plain.total ?? 0)),
      };
    });

    return {
      data: enriched,
      meta: {
        total,
        page: safePage,
        lastPage: Math.max(1, Math.ceil(total / safeLimit)),
      },
    };
  }
}
