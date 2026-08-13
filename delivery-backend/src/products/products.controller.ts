import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ParseMongoIdPipe } from 'src/common/pipes/parse-mongo-id.pipe';
import { Public } from 'src/auth/public.decorator';
import { ApiOperation, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProductPaginationDto } from './dto/product-pagination.dto';
import { Query } from '@nestjs/common';


@ApiTags('products')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() body: CreateProductDto) {
    return this.productsService.create(body);
  }

  @ApiOperation({ summary: 'Obtener todas los productos' })
  @Public()
  @Get()
  findAll(@Query() paginationQuery: ProductPaginationDto) {
    return this.productsService.findAll(paginationQuery);
  }

  @ApiOperation({ summary: 'Obtener un producto por ID' })
  @Public()
  @Get(':id')
  findOne(@Param('id', ParseMongoIdPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @ApiOperation({ summary: 'Actualizar un producto por ID' })
  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id', ParseMongoIdPipe) id: string, @Body() body: UpdateProductDto) {
    return this.productsService.update(id, body);
  }

  @ApiOperation({ summary: 'Eliminar un producto por ID' })
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseMongoIdPipe) id: string) {
    return this.productsService.remove(id);
  }
}
