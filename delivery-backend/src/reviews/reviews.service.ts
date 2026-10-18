import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review } from './schemas/review.schema';
import { CreateReviewDto } from './dto/create-review.dto';

// Importamos Order y su enum para validar el estado
import { Order } from '../orders/schemas/order.schema';
import { OrderStatus } from '../orders/order-status.enum';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private readonly reviewModel: Model<Review>,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
  ) {}

  async create(userId: string, dto: CreateReviewDto): Promise<Review> {
    // 1. Verificar que la orden existe y pertenece al usuario
    const order = await this.orderModel.findById(dto.order);
    if (!order) throw new NotFoundException('Orden no encontrada.');

    if (order.userId.toString() !== userId)
      throw new ForbiddenException(
        'No puedes reseñar una orden que no es tuya.',
      );

    // 2. Regla de negocio clave: solo se puede reseñar si fue entregada
    if (order.status !== OrderStatus.DELIVERED)
      throw new BadRequestException(
        'Solo puedes reseñar órdenes que ya fueron entregadas.',
      );

    // 3. Verificar que el producto realmente formó parte de esa orden (si la orden tiene items)
    if (order.items && order.items.length > 0) {
      const productInOrder = order.items.some(
        (item: any) =>
          (item.productId?._id ?? item.productId)?.toString() === dto.product,
      );
      if (!productInOrder) {
        throw new BadRequestException(
          'El producto que intentas reseñar no forma parte de esta orden.',
        );
      }
    }

    // 4. Evitar reseña duplicada (el índice único del schema también lo protege, pero damos un mensaje bonito)
    const existing = await this.reviewModel.findOne({
      user: new Types.ObjectId(userId),
      product: new Types.ObjectId(dto.product),
      order: new Types.ObjectId(dto.order),
    });
    if (existing)
      throw new ConflictException(
        'Ya dejaste una reseña para este producto en esta orden.',
      );

    // 5. Crear la reseña
    const review = new this.reviewModel({
      user: new Types.ObjectId(userId),
      product: new Types.ObjectId(dto.product),
      order: new Types.ObjectId(dto.order),
      rating: dto.rating,
      comment: dto.comment,
    });

    return review.save();
  }

  async findByProduct(productId: string): Promise<Review[]> {
    if (!Types.ObjectId.isValid(productId))
      throw new BadRequestException('ID de producto inválido.');
    return this.reviewModel
      .find({ product: new Types.ObjectId(productId) })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  async remove(
    reviewId: string,
    userId: string,
    role?: string,
  ): Promise<{ message: string }> {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) throw new NotFoundException('Reseña no encontrada.');

    if (review.user.toString() !== userId && role !== 'ADMIN')
      throw new ForbiddenException(
        'No puedes eliminar una reseña que no es tuya.',
      );

    await review.deleteOne();
    return { message: 'Reseña eliminada correctamente.' };
  }
}
