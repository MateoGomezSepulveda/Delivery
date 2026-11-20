import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/auth/roles.enum';
import { ParseMongoIdPipe } from 'src/common/pipes/parse-mongo-id.pipe';
import { CreateDeliveryProfileDto } from './dto/create-delivery-profile.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { ReviewDeliveryProfileDto } from './dto/review-delivery-profile.dto';

@ApiTags('Delivery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post('profile')
  @Roles(Role.CLIENT, Role.DELIVERY)
  @ApiOperation({
    summary:
      'Enviar solicitud de perfil de repartidor (queda PENDING hasta aprobación de Admin)',
  })
  createProfile(@Request() req, @Body() dto: CreateDeliveryProfileDto) {
    return this.deliveryService.createProfile(req.user.userId, dto);
  }

  @Get('profile')
  @Roles(Role.CLIENT, Role.DELIVERY)
  @ApiOperation({
    summary: 'Ver mi perfil o estado de solicitud de repartidor',
  })
  getMyProfile(@Request() req) {
    return this.deliveryService.getMyProfile(req.user.userId);
  }

  @Get('profiles')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Listar solicitudes y perfiles de repartidores (Admin)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filtrar por estado: PENDING, APPROVED o REJECTED',
  })
  listProfiles(@Query('status') status?: string) {
    return this.deliveryService.listProfiles(status);
  }

  @Patch('profiles/:id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Aprobar o rechazar solicitud de repartidor (promueve CLIENT -> DELIVERY al aprobar)',
  })
  reviewProfileStatus(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: ReviewDeliveryProfileDto,
  ) {
    return this.deliveryService.reviewProfileStatus(
      id,
      dto.status,
      dto.rejectionReason,
    );
  }

  @Patch('availability')
  @Roles(Role.DELIVERY)
  @ApiOperation({ summary: 'Actualizar disponibilidad (activo/inactivo)' })
  updateAvailability(@Request() req, @Body() dto: UpdateAvailabilityDto) {
    return this.deliveryService.updateAvailability(req.user.userId, dto);
  }

  @Patch('location')
  @Roles(Role.DELIVERY)
  @ApiOperation({ summary: 'Actualizar ubicación GPS en tiempo real' })
  updateLocation(@Request() req, @Body() dto: UpdateLocationDto) {
    return this.deliveryService.updateLocation(req.user.userId, dto);
  }

  @Get('orders/available')
  @Roles(Role.DELIVERY)
  @ApiOperation({ summary: 'Ver pedidos disponibles para recoger' })
  getAvailableOrders() {
    return this.deliveryService.getAvailableOrders();
  }

  @Get('orders/active')
  @Roles(Role.DELIVERY)
  @ApiOperation({ summary: 'Ver mis pedidos actualmente en camino' })
  getActiveOrders(@Request() req) {
    return this.deliveryService.getActiveOrders(req.user.userId);
  }

  @Get('orders/history')
  @Roles(Role.DELIVERY)
  @ApiOperation({
    summary: 'Ver historial paginado de entregas completadas y ganancias',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getOrderHistory(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.deliveryService.getOrderHistory(
      req.user.userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  @Patch('orders/:id/accept')
  @Roles(Role.DELIVERY)
  @ApiOperation({
    summary: 'Aceptar y tomar un pedido (requiere estar Online)',
  })
  acceptOrder(@Request() req, @Param('id', ParseMongoIdPipe) id: string) {
    return this.deliveryService.acceptOrder(req.user.userId, id);
  }

  @Patch('orders/:id/deliver')
  @Roles(Role.DELIVERY)
  @ApiOperation({ summary: 'Marcar pedido como entregado' })
  deliverOrder(@Request() req, @Param('id', ParseMongoIdPipe) id: string) {
    return this.deliveryService.deliverOrder(req.user.userId, id);
  }

  @Get('stats')
  @Roles(Role.DELIVERY)
  @ApiOperation({
    summary: 'Ver mis estadísticas de entregas, hoy y ganancias estimadas',
  })
  getMyStats(@Request() req) {
    return this.deliveryService.getMyStats(req.user.userId);
  }
}
