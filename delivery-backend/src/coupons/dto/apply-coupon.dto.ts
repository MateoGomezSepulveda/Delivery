import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class ApplyCouponDto {
  @ApiProperty({
    description: 'Código del cupón a aplicar',
    example: 'BIENVENIDA20',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'Subtotal del pedido sobre el cual se calculará el descuento',
    example: 35000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  orderTotal: number;
}
