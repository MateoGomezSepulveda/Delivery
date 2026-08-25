import { IsOptional, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Página actual', default: 1 })
  @IsOptional()
  @IsPositive()
  @Type(() => Number) // Transforma el string de la URL a Número
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Cantidad de resultados por página',
    default: 10,
  })
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Término de búsqueda (opcional)' })
  @IsOptional()
  @IsString()
  search?: string;
}
