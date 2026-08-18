import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class RemoveFromCartDto {
    @ApiProperty({
        example: '64b1f1c2e4b0a1a2b3c4d5e6',
        description: 'El ID de MongoDB del producto a remover',
    })
    @IsNotEmpty()
    @IsMongoId({ message: 'El ID del producto debe ser un ObjectId válido' })
    productId: string;
}