import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { OrdersService } from './orders.service';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/auth/roles.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import {  OrderStatus } from './order-status.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
    constructor(
        private readonly ordersService: OrdersService,
    ){}

    @Post()
    createOrder(@Req() req, @Body() body: CreateOrderDto) {
        return this.ordersService.createOrder(req.user.userId, body.address);
    }

    @Get('me')
    findMyOrders(@Req() req) {
        return this.ordersService.findMyOrders(req.user.userId);
    }

    @Get()
    @Roles(Role.ADMIN)
    findAll(){
        return this.ordersService.findAllOrders();
    }

    @Patch(':id/status')
    @Roles(Role.ADMIN)
    updateStatus(
        @Param('id') id: string,
        @Body() body: { status: OrderStatus },
    ) {
        return this.ordersService.updateStatus(id, body.status);
    }
}