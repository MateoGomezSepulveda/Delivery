import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Category } from 'src/categories/schemas/category.schema';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  price: number;

  @Prop({ type: Number, default: 0, min: 0 })
  costPrice: number;

  @Prop({ type: Number, default: 10, min: 0 })
  stock: number;

  @Prop({ type: Number, default: 5, min: 1 })
  lowStockThreshold: number;

  @Prop({ default: true })
  available: boolean;

  @Prop({ type: String, default: null })
  image?: string | null;

  @Prop({ type: Types.ObjectId, ref: Category.name, required: true })
  categoryId: string;

  @Prop()
  createdBy?: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ name: 'text', description: 'text' });
ProductSchema.index({ categoryId: 1, available: 1, price: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ stock: 1, available: 1 });
