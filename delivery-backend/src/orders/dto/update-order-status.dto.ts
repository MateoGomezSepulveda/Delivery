import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../order-status.enum';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({
    description:
      'ID del repartidor (rol DELIVERY) a asignar al despachar el pedido a OUT_FOR_DELIVERY',
  })
  @IsOptional()
  @IsMongoId()
  deliveryId?: string;
}
