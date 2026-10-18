import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Review extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  order: Types.ObjectId; // Crucial para validar que la orden existe y fue entregada

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ trim: true, maxlength: 500 })
  comment: string;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Indice compuesto para evitar que un usuario califique el mismo producto en la misma orden más de una vez
ReviewSchema.index({ user: 1, product: 1, order: 1 }, { unique: true });
