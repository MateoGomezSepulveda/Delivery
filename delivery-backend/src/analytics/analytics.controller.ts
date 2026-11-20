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
    summary:
      'Obtener KPIs financieros reales (ingresos, costos, ganancia neta, margen), alertas de inventario y órdenes por estado (Admin)',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description:
      'Opcional: limitar métricas de ventas y ganancias a los últimos N días (si se omite, histórico completo)',
  })
  getDashboardSummary(@Query('days') days?: number) {
    const parsedDays = days ? Number(days) : undefined;
    return this.analyticsService.getDashboardSummary(
      parsedDays && parsedDays > 0 ? parsedDays : undefined,
    );
  }

  @Get('top-products')
  @ApiOperation({
    summary:
      'Obtener el ranking de productos con ventas, costo de compra y ganancia real (Admin)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Cantidad de productos en el ranking (por defecto 5)',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Opcional: filtrar ventas por los últimos N días',
  })
  getTopProducts(
    @Query('limit') limit?: number,
    @Query('days') days?: number,
  ) {
    const parsedDays = days ? Number(days) : undefined;
    return this.analyticsService.getTopProducts(
      limit ? Number(limit) : 5,
      parsedDays && parsedDays > 0 ? parsedDays : undefined,
    );
  }

  @Get('sales')
  @ApiOperation({
    summary:
      'Obtener evolución diaria de ventas, costos de compra y ganancia neta real (Admin)',
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
