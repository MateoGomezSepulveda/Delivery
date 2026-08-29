import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { Query } from '@nestjs/common';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { ParseMongoIdPipe } from 'src/common/pipes/parse-mongo-id.pipe';
import { ApiParam } from '@nestjs/swagger';
import { ChangeRoleDto } from './dto/change-role.dto';


@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @ApiOperation({ summary: 'Obtener todos los usuarios (Solo Admin)' })
  @Roles(Role.ADMIN)
  @Get()
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.usersService.findAll(paginationQuery);
  }

  @ApiOperation({ summary: 'Obtener un usuario por ID (Admin o dueñ)' })
  @UseGuards(OwnershipGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Public()
  @ApiOperation({ summary: 'Crear un usuario (Público)' })
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @ApiOperation({ summary: 'Actualizar un usuario por ID (Admin o dueño)' })
  @UseGuards(OwnershipGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @ApiOperation({ summary: 'Eliminar un usuario por ID (Solo Admin)' })
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch(':id/role')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cambiar el rol de un usuario (Solo ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  changeRole(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.usersService.changeRole(id, dto.role);
  }

}
