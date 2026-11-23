import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsMongoId, IsNotEmpty, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({
    example: '64b1f1c2e4b0a1a2b3c4d5e6',
    description: 'El ID de MongoDB del producto en el carrito',
  })
  @IsNotEmpty()
  @IsMongoId({ message: 'El ID del producto debe ser un ObjectId válido' })
  productId: string;

  @ApiProperty({
    example: 2,
    description:
      'Nueva cantidad del producto en el carrito (0 elimina el producto)',
    minimum: 0,
  })
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(0, { message: 'La cantidad no puede ser negativa' })
  quantity: number;
}
