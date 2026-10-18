import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ description: 'ID del producto a reseñar' })
  @IsMongoId()
  product: string;

  @ApiProperty({
    description: 'ID de la orden (debe estar en estado DELIVERED)',
  })
  @IsMongoId()
  order: string;

  @ApiProperty({
    description: 'Calificación del 1 al 5',
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Comentario opcional', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
