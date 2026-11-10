import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Obtener KPIs generales y desglose de órdenes por estado (Admin)',
  })
  getDashboardSummary() {
    return this.analyticsService.getDashboardSummary();
  }

  @Get('top-products')
  @ApiOperation({
    summary: 'Obtener el ranking de productos más vendidos (Admin)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Cantidad de productos en el top (por defecto 5)',
  })
  getTopProducts(@Query('limit') limit?: number) {
    return this.analyticsService.getTopProducts(limit ? Number(limit) : 5);
  }

  @Get('sales')
  @ApiOperation({
    summary: 'Obtener evolución de ventas e ingresos diarios (Admin)',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Últimos N días a consultar (por defecto 30)',
  })
  getSalesByDay(@Query('days') days?: number) {
    return this.analyticsService.getSalesByDay(days ? Number(days) : 30);
  }
}
