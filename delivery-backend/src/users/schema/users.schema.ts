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

  @Prop({ required: false })
  password?: string;

  @ApiProperty({ description: 'ID único de cuenta de Google vinculada', required: false })
  @Prop({ index: true, sparse: true })
  googleId?: string;

  @ApiProperty({ description: 'ID único de cuenta de Facebook vinculada', required: false })
  @Prop({ index: true, sparse: true })
  facebookId?: string;

  @ApiProperty({
    description: 'Proveedores de autenticación activos (local, google, facebook)',
    default: ['local'],
  })
  @Prop({ type: [String], default: ['local'] })
  authProviders: string[];

  @ApiProperty({ description: 'URL de la foto de perfil del usuario', required: false })
  @Prop({ type: String, default: null })
  avatarUrl?: string | null;

  @Prop({ type: String, enum: Role, default: Role.CLIENT })
  role: Role;

  @ApiProperty({
    description: 'Indica si el usuario verificó su correo electrónico',
    default: false,
  })
  @Prop({ type: Boolean, default: false })
  isEmailVerified: boolean;

  @ApiProperty({
    description: 'Indica si el número de celular fue verificado por SMS',
    default: false,
  })
  @Prop({ type: Boolean, default: false })
  isPhoneVerified: boolean;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
