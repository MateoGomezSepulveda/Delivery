import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../payment-method.enum';

export class CreateOrderDto {
  @ApiProperty({ example: 'Calle 85 #15-20, Bogotá' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({
    example: 'BIENVENIDA20',
    description: 'Código de cupón promocional opcional',
  })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    default: PaymentMethod.MERCADOPAGO,
    description: 'Método de pago elegido (MERCADOPAGO o CASH_ON_DELIVERY)',
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    example: 100000,
    description:
      'Billete o monto en efectivo con el que pagará el cliente (opcional, solo CASH_ON_DELIVERY)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cashAmountGiven?: number;
}
