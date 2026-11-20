import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryProfileStatus } from '../schemas/delivery-profile.schema';

export class ReviewDeliveryProfileDto {
  @ApiProperty({
    enum: [DeliveryProfileStatus.APPROVED, DeliveryProfileStatus.REJECTED],
    example: DeliveryProfileStatus.APPROVED,
  })
  @IsIn([DeliveryProfileStatus.APPROVED, DeliveryProfileStatus.REJECTED])
  status: DeliveryProfileStatus.APPROVED | DeliveryProfileStatus.REJECTED;

  @ApiPropertyOptional({
    example: 'Documentación o placa incompleta',
    description: 'Motivo opcional al rechazar la solicitud',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  rejectionReason?: string;
}
