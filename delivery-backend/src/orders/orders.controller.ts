import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { OrdersService } from './orders.service';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/auth/roles.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { VerifyOrderPaymentDto } from './dto/verify-order-payment.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ParseMongoIdPipe } from 'src/common/pipes/parse-mongo-id.pipe';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un pedido a partir del carrito activo' })
  createOrder(@Req() req, @Body() body: CreateOrderDto) {
    return this.ordersService.createOrder(
      req.user.userId,
      body.address,
      body.couponCode,
      body.paymentMethod,
      body.cashAmountGiven,
    );
  }

  @Get('rider-discount-quota')
  @ApiOperation({
    summary:
      'Consultar el cupo mensual restante del beneficio de -10% para repartidores',
  })
  getRiderDiscountQuota(@Req() req) {
    return this.ordersService.getRiderDiscountQuota(req.user.userId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Obtener los pedidos del usuario autenticado' })
  findMyOrders(@Req() req, @Query() paginationDto: OrderPaginationDto) {
    return this.ordersService.findMyOrders(req.user.userId, paginationDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Obtener todos los pedidos (Admin)' })
  findAll(@Query() paginationDto: OrderPaginationDto) {
    return this.ordersService.findAllOrders(paginationDto);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'El cliente cancela su propio pedido (solo si está PENDING)',
  })
  cancelOrder(@Param('id', ParseMongoIdPipe) id: string, @Req() req) {
    return this.ordersService.cancelOrderByClient(id, req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalle de un pedido específico' })
  findOne(@Param('id', ParseMongoIdPipe) id: string, @Req() req) {
    return this.ordersService.findOne(id, req.user);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar el estado del pedido (Admin)' })
  updateStatus(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() body: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, body.status, body.deliveryId);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Generar URL de pago para una orden' })
  payOrder(@Param('id', ParseMongoIdPipe) id: string, @Req() req) {
    return this.ordersService.payOrder(id, req.user.userId);
  }

  @Post(':id/verify-payment')
  @ApiOperation({
    summary:
      'Verificar el estado real de un pago de MercadoPago para una orden',
  })
  verifyPayment(
    @Param('id', ParseMongoIdPipe) id: string,
    @Req() req,
    @Body() body: VerifyOrderPaymentDto,
  ) {
    return this.ordersService.verifyOrderPayment(id, req.user, body.paymentId);
  }
}
