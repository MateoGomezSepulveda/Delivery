import {
    Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeliveryProfile, DeliveryProfileDocument } from './schemas/delivery-profile.schema';
import { Order, OrderDocument } from 'src/orders/schemas/order.schema';
import { OrderStatus } from 'src/orders/order-status.enum';
import { CreateDeliveryProfileDto } from './dto/create-delivery-profile.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@Injectable()
export class DeliveryService {
    constructor(
        @InjectModel(DeliveryProfile.name)
        private deliveryProfileModel: Model<DeliveryProfileDocument>,
        @InjectModel(Order.name)
        private orderModel: Model<OrderDocument>,
    ) { }

    // Crear perfil de repartidor (solo una vez por usuario)
    async createProfile(userId: string, dto: CreateDeliveryProfileDto) {
        const existing = await this.deliveryProfileModel.findOne({ userId });
        if (existing) throw new ConflictException('Ya tienes un perfil de repartidor.');
        return this.deliveryProfileModel.create({ ...dto, userId });
    }

    // Ver mi perfil
    async getMyProfile(userId: string) {
        const profile = await this.deliveryProfileModel.findOne({ userId });
        if (!profile) throw new NotFoundException('Perfil de repartidor no encontrado.');
        return profile;
    }

    // Actualizar disponibilidad (estoy trabajando hoy o no)
    async updateAvailability(userId: string, dto: UpdateAvailabilityDto) {
        return this.deliveryProfileModel.findOneAndUpdate(
            { userId },
            { isAvailable: dto.isAvailable },
            { new: true },
        );
    }

    // Actualizar ubicación GPS en tiempo real
    async updateLocation(userId: string, dto: UpdateLocationDto) {
        return this.deliveryProfileModel.findOneAndUpdate(
            { userId },
            { currentLocation: { lat: dto.lat, lng: dto.lng } },
            { new: true },
        );
    }

    // Ver pedidos disponibles para recoger (estado PREPARING)
    async getAvailableOrders() {
        return this.orderModel
            .find({ status: OrderStatus.PREPARING, deliveryId: null })
            .populate('userId', 'name email')
            .sort({ createdAt: 1 }); // El más antiguo primero
    }

    // Aceptar un pedido (el repartidor lo toma)
    async acceptOrder(userId: string, orderId: string) {
        const order = await this.orderModel.findById(orderId);
        if (!order) throw new NotFoundException('Pedido no encontrado.');
        if (order.status !== OrderStatus.PREPARING)
            throw new BadRequestException('Este pedido no está disponible para recoger.');
        if (order.deliveryId)
            throw new BadRequestException('Este pedido ya fue tomado por otro repartidor.');

        return this.orderModel.findByIdAndUpdate(
            orderId,
            { deliveryId: userId, status: OrderStatus.OUT_FOR_DELIVERY },
            { new: true },
        );
    }

    // Marcar pedido como entregado
    async deliverOrder(userId: string, orderId: string) {
        const order = await this.orderModel.findById(orderId);
        if (!order) throw new NotFoundException('Pedido no encontrado.');
        if (order.deliveryId?.toString() !== userId)
            throw new BadRequestException('Este pedido no te pertenece.');
        if (order.status !== OrderStatus.OUT_FOR_DELIVERY)
            throw new BadRequestException('Este pedido no está en camino.');

        return this.orderModel.findByIdAndUpdate(
            orderId,
            { status: OrderStatus.DELIVERED },
            { new: true },
        );
    }

    // Mis estadísticas como repartidor
    async getMyStats(userId: string) {
        const delivered = await this.orderModel.countDocuments({
            deliveryId: userId,
            status: OrderStatus.DELIVERED,
        });
        const inProgress = await this.orderModel.countDocuments({
            deliveryId: userId,
            status: OrderStatus.OUT_FOR_DELIVERY,
        });
        return { delivered, inProgress };
    }
}
