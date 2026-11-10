import {
  IsOptional,
  IsMongoId,
  IsNumber,
  Min,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class ProductPaginationDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID de categoría' })
  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Precio mínimo' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Precio máximo' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Filtrar por disponibilidad' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  available?: boolean;

  @ApiPropertyOptional({
    description: 'Campo por el cual ordenar',
    enum: ['price', 'createdAt', 'name'],
  })
  @IsOptional()
  @IsIn(['price', 'createdAt', 'name'])
  sortBy?: 'price' | 'createdAt' | 'name';

  @ApiPropertyOptional({
    description: 'Dirección de ordenamiento',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
