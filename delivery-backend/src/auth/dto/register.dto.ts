import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

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

  @ApiPropertyOptional({
    example: '3001234567',
    description: 'Teléfono de contacto (opcional)',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}
