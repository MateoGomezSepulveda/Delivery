import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { Model } from 'mongoose';
import { CartService } from 'src/cart/cart.service';
import { OrderStatus } from './order-status.enum';

const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    [OrderStatus.PREPARING]: [OrderStatus.OUT_FOR_DELIVERY],
    [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class OrdersService {
    constructor(
        @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
        private cartService: CartService,
    ){}

    

    async createOrder(userId: string, address: string){
        const cart = await this.cartService.getActiveCart(userId);

        if(!cart.items.length){
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

        return order.save();
    }

    async findMyOrders(userId: string){
        return this.orderModel
        .find({ userId })
        .populate('items.productId');
    }

    async findAllOrders(){
        return this.orderModel
        .find()
        .populate('items.productId')
        .populate('userId');
    }

    async updateStatus(orderId: string, status: OrderStatus){ 
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
        return order.save();
    }
    
}
