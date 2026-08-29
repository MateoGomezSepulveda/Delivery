import {
    Controller, Post, Get, Patch, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/auth/roles.enum';
import { ParseMongoIdPipe } from 'src/common/pipes/parse-mongo-id.pipe';
import { CreateDeliveryProfileDto } from './dto/create-delivery-profile.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@ApiTags('Delivery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('delivery')
export class DeliveryController {
    constructor(private readonly deliveryService: DeliveryService) { }

    @Post('profile')
    @Roles(Role.DELIVERY)
    @ApiOperation({ summary: 'Crear perfil de repartidor' })
    createProfile(@Request() req, @Body() dto: CreateDeliveryProfileDto) {
        return this.deliveryService.createProfile(req.user.userId, dto);
    }

    @Get('profile')
    @Roles(Role.DELIVERY)
    @ApiOperation({ summary: 'Ver mi perfil de repartidor' })
    getMyProfile(@Request() req) {
        return this.deliveryService.getMyProfile(req.user.userId);
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

    @Patch('orders/:id/accept')
    @Roles(Role.DELIVERY)
    @ApiOperation({ summary: 'Aceptar y tomar un pedido' })
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
    @ApiOperation({ summary: 'Ver mis estadísticas de entregas' })
    getMyStats(@Request() req) {
        return this.deliveryService.getMyStats(req.user.userId);
    }
}
