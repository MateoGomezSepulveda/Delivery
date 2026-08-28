import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Address extends Document {
    @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ required: true, trim: true })
    title: string; // ej: "Casa", "Oficina", "Apartamento de mi novia"

    @Prop({ required: true, trim: true })
    street: string; // ej: "Av. Siempre Viva 742"

    @Prop({ required: true, trim: true })
    city: string;

    @Prop({ required: true, trim: true })
    state: string;

    @Prop({ required: true, trim: true })
    zipCode: string;

    @Prop({ required: true, trim: true })
    country: string;

    @Prop({ default: false })
    isDefault: boolean; // Para saber cuál es la dirección principal

    @Prop({ trim: true })
    phone?: string; // Teléfono opcional por si el repartidor necesita llamar

    @Prop({ trim: true })
    deliveryInstructions?: string; // ej: "Dejar en portería", "Tocar fuerte el timbre"
}

export const AddressSchema = SchemaFactory.createForClass(Address);
