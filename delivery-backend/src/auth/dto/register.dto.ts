import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { PHONE_VALIDATION_REGEX } from '../../common/utils/phone.util';

export class RegisterDto {
  @ApiProperty({ example: 'Mateo Gómez', description: 'Nombre completo' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  name: string;

  @ApiProperty({
    example: 'mateo@correo.com',
    description: 'Correo electrónico del usuario',
  })
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido.' })
  email: string;

  @ApiProperty({ example: '123456', description: 'Contraseña (mín. 6 caracteres)' })
  @MinLength(6, { message: 'La contraseña debe tener mínimo 6 caracteres.' })
  password: string;

  @ApiProperty({
    example: '3001234567',
    description: 'Número de celular obligatorio para entregas y verificación',
  })
  @IsString({ message: 'El número de celular debe ser texto válido.' })
  @IsNotEmpty({ message: 'El número de celular es obligatorio.' })
  @Matches(PHONE_VALIDATION_REGEX, {
    message: 'Ingresa un número de celular válido (mínimo 10 dígitos).',
  })
  phone: string;

  @ApiPropertyOptional({
    enum: ['email', 'sms'],
    default: 'email',
    description: 'Canal preferido para recibir el código de verificación',
  })
  @IsOptional()
  @IsIn(['email', 'sms'], {
    message: 'El canal de verificación debe ser email o sms.',
  })
  verificationChannel?: 'email' | 'sms';
}
