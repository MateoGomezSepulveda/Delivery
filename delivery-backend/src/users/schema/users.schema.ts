import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../../auth/roles.enum';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @ApiProperty({ description: 'Teléfono del usuario' })
  @Prop()
  phone?: string;

  @ApiProperty({
    description: 'Tokens de FCM para enviar notificaciones push al dispositivo',
  })
  @Prop({ type: [String], default: [] })
  fcmTokens: string[];

  @Prop({ required: true })
  password: string;

  @Prop({ type: String, enum: Role, default: Role.CLIENT })
  role: Role;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
