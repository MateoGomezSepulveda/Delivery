import {
  IsOptional,
  IsMongoId,
  IsNumber,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class ProductPaginationDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  available?: boolean;
}
