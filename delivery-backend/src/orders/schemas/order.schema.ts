import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { Product } from 'src/products/schemas/product.schema';
import { User } from 'src/users/schema/users.schema';
import { OrderStatus } from '../order-status.enum';

export type OrderDocument = Order & Document;

@Schema()
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: Product.name })
  productId: string;

  @Prop()
  name: string;

  @Prop()
  quantity: number;

  @Prop()
  price: number;
}

const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  userId: string;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ required: true })
  total: number;

  @Prop()
  address: string;

  @Prop({
    type: String,
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Prop()
  paymentId?: string;

  @Prop()
  paymentUrl?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
