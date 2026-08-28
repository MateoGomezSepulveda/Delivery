import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';

@ApiTags('Addresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva dirección' })
  @ApiResponse({ status: 201, description: 'Dirección creada exitosamente.' })
  create(@Req() req, @Body() createAddressDto: CreateAddressDto) {
    // req.user existe gracias al JwtAuthGuard
    const userId = req.user.userId;
    return this.addressesService.create(userId, createAddressDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las direcciones del usuario autenticado',
  })
  findAll(@Req() req) {
    const userId = req.user.userId;
    return this.addressesService.findAllByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una dirección por su ID' })
  findOne(@Req() req, @Param('id', ParseMongoIdPipe) id: string) {
    const userId = req.user.userId;
    return this.addressesService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una dirección' })
  update(
    @Req() req,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    const userId = req.user.userId;
    return this.addressesService.update(id, userId, updateAddressDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una dirección' })
  remove(@Req() req, @Param('id', ParseMongoIdPipe) id: string) {
    const userId = req.user.userId;
    return this.addressesService.remove(id, userId);
  }
}
