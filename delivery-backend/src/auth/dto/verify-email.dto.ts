import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';

export class VerifyEmailDto {
  @ApiPropertyOptional({
    example: 'mateo@correo.com',
    description:
      'Correo electrónico del usuario (requerido al verificar con código de 6 dígitos por correo)',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido.' })
  email?: string;

  @ApiPropertyOptional({
    example: '+573001234567',
    description:
      'Número de celular del usuario (opcional para verificar código enviado por SMS)',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: '482913',
    description: 'Código numérico de verificación de 6 dígitos',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'El código de verificación debe tener exactamente 6 dígitos.',
  })
  code?: string;

  @ApiPropertyOptional({
    description: 'Token hexadecimal recibido en el enlace de verificación',
  })
  @IsOptional()
  @IsString()
  token?: string;
}
