import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { User } from 'src/users/schema/users.schema';

export type DeliveryProfileDocument = DeliveryProfile & Document;

export enum VehicleType {
  MOTO = 'MOTO',
  CAR = 'CAR',
  BICYCLE = 'BICYCLE',
}

export enum DeliveryProfileStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Schema({ timestamps: true })
export class DeliveryProfile {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: VehicleType, required: true })
  vehicleType: VehicleType;

  @Prop()
  plate?: string;

  @Prop()
  licensePlate?: string;

  @Prop()
  phone?: string;

  @Prop({
    type: String,
    enum: DeliveryProfileStatus,
    default: DeliveryProfileStatus.PENDING,
  })
  status: DeliveryProfileStatus;

  @Prop()
  rejectionReason?: string;

  @Prop()
  reviewedAt?: Date;

  @Prop({ default: false })
  isAvailable: boolean;

  @Prop({ type: { lat: Number, lng: Number } })
  currentLocation?: { lat: number; lng: number };
}

export const DeliveryProfileSchema =
  SchemaFactory.createForClass(DeliveryProfile);
DeliveryProfileSchema.index({ status: 1, createdAt: -1 });
