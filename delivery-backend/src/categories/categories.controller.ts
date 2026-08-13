import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Query } from '@nestjs/common';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { CategoriesService } from './categories.service';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/auth/roles.enum';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Public } from 'src/auth/public.decorator';
import { ParseMongoIdPipe } from 'src/common/pipes/parse-mongo-id.pipe';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('categories')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @ApiOperation({ summary: 'Crear una categoria' })
    @Post()
    @Roles(Role.ADMIN)
    create(@Body() body: CreateCategoryDto) {
        return this.categoriesService.create(body);
    }

    @ApiOperation({ summary: 'Obtener todas las categorias' })
    @Public()
    @Get()
    findAll(@Query() paginationQuery: PaginationQueryDto) {
        return this.categoriesService.findAll(paginationQuery);
    }

    @ApiOperation({ summary: 'Obtener una categoria por ID' })
    @Public()
    @Get(':id')
    findOne(@Param('id', ParseMongoIdPipe) id: string) {
        return this.categoriesService.findOne(id);
    }

    @ApiOperation({ summary: 'Actualizar una categoria por ID' })
    @Patch(':id')
    @Roles(Role.ADMIN)
    update(@Param('id', ParseMongoIdPipe) id: string, @Body() body: UpdateCategoryDto) {
        return this.categoriesService.update(id, body);
    }

    @ApiOperation({ summary: 'Eliminar una categoria por ID' })
    @Delete(':id')
    @Roles(Role.ADMIN)
    remove(@Param('id', ParseMongoIdPipe) id: string) {
        return this.categoriesService.remove(id);
    }
}
