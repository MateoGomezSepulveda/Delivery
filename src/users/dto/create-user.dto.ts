import { IsEmail, IsEnum, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { Role } from '../../auth/roles.enum';
import { ApiProperty } from '@nestjs/swagger';


export class CreateUserDto {
  @ApiProperty({ example: 'Mateo', description: 'Nombre completo del usuario' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'ejemplo@mail', description: 'Correo electrónico del usuario' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', description: 'Contraseña del usuario' })
  @MinLength(6)
  password: string;

  @IsOptional({
    message: "El rol es opcional"
  })
  @IsEnum(Role)
  role?: Role;
}
