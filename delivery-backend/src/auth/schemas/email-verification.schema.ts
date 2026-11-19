import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schema/users.schema';

export type EmailVerificationDocument = EmailVerification & Document;

@Schema({ timestamps: true })
export class EmailVerification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: User | Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ type: String, trim: true, index: true })
  phone?: string;

  @Prop({ type: String, enum: ['email', 'sms'], default: 'email' })
  channel: 'email' | 'sms';

  @Prop({ type: String, enum: ['local', 'twilio-verify'], default: 'local' })
  verificationMode?: 'local' | 'twilio-verify';

  @Prop({ required: true })
  code: string;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ type: Number, default: 0 })
  attempts: number;

  @Prop({ required: true, expires: 0 })
  expiresAt: Date;
}

export const EmailVerificationSchema =
  SchemaFactory.createForClass(EmailVerification);
