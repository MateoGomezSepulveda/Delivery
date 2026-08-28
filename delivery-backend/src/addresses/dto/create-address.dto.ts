import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ example: 'Casa' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Av. Siempre Viva 742' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ example: 'Springfield' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'NT' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: '12345' })
  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @ApiProperty({ example: 'USA' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ example: '+123456789' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Dejar en la puerta' })
  @IsString()
  @IsOptional()
  deliveryInstructions?: string;
}
