import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyOrderPaymentDto {
  @ApiProperty({
    example: '1324567890',
    description:
      'ID del pago reportado por MercadoPago (payment_id o collection_id)',
  })
  @IsString()
  @IsNotEmpty()
  paymentId: string;
}
