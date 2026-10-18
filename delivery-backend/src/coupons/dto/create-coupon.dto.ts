import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { DiscountType } from '../schemas/coupon.schema';

export class CreateCouponDto {
  @ApiProperty({
    description: 'Código único del cupón (se convertirá a mayúsculas)',
    example: 'BIENVENIDA20',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description:
      'Tipo de descuento: PERCENTAGE (porcentaje) o FIXED (monto fijo)',
    enum: DiscountType,
    example: DiscountType.PERCENTAGE,
  })
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @ApiProperty({
    description: 'Valor del descuento (ej. 20 para 20% o 5000 para $5000)',
    example: 20,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  discountValue: number;

  @ApiPropertyOptional({
    description: 'Monto mínimo de compra requerido para usar el cupón',
    example: 20000,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({
    description: 'Tope máximo de descuento (útil en descuentos por porcentaje)',
    example: 10000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiProperty({
    description: 'Fecha de expiración en formato ISO 8601',
    example: '2027-12-31T23:59:59.000Z',
  })
  @IsDateString()
  expirationDate: string;

  @ApiPropertyOptional({
    description: 'Límite total de usos permitidos para este cupón',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({
    description: 'Indica si el cupón está activo',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
