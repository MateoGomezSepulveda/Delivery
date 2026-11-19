import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({
    example: 'mateo@correo.com',
    description: 'Correo electrónico pendiente de verificación',
  })
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido.' })
  email: string;
}
