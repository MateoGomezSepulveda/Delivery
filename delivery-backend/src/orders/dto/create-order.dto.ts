import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
}
