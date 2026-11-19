import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({
    example: 'mateo@correo.com',
    description: 'Correo electrónico pendiente de verificación',
  })
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido.' })
  email: string;

  @ApiPropertyOptional({
    enum: ['email', 'sms'],
    default: 'email',
    description: 'Canal para reenviar el código de verificación (email o sms)',
  })
  @IsOptional()
  @IsIn(['email', 'sms'], {
    message: 'El canal de verificación debe ser email o sms.',
  })
  channel?: 'email' | 'sms';
}
