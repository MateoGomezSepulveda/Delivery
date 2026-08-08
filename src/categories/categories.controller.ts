import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/auth/roles.enum';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService){}

    @Post()
    @Roles(Role.ADMIN)
    create(@Body() body:CreateCategoryDto){
        return this.categoriesService.create(body);
    }

    @Get()
    findAll(){
        return this.categoriesService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.categoriesService.findOne(id);
  }

    @Patch(':id')
    @Roles(Role.ADMIN)
    update(@Param('id') id:string, @Body() body: UpdateCategoryDto){
        return this.categoriesService.update(id, body);
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    remove(@Param('id') id:string){
        return this.categoriesService.remove(id);
    }
}
