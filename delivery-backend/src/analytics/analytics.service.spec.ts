import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { getModelToken } from '@nestjs/mongoose';
import { Order } from '../orders/schemas/order.schema';
import { Product } from '../products/schemas/product.schema';
import { User } from '../users/schema/users.schema';
import { OrderStatus } from '../orders/order-status.enum';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const mockOrderModel = {
    aggregate: jest.fn(),
  };

  const mockProductModel = {
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  };

  const mockUserModel = {
    countDocuments: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: getModelToken(Product.name), useValue: mockProductModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardSummary', () => {
    it('debe calcular los KPIs financieros reales (ingresos, costos, ganancia neta, margen) e inventario', async () => {
      mockOrderModel.aggregate
        .mockResolvedValueOnce([
          {
            totalRevenue: 120000,
            totalCost: 75000,
            netProfit: 45000,
            totalUnitsSold: 6,
            paidOrdersCount: 4,
            averageOrderValue: 30000,
          },
        ])
        .mockResolvedValueOnce([
          { _id: OrderStatus.DELIVERED, count: 4 },
          { _id: OrderStatus.PENDING, count: 1 },
        ]);
      mockUserModel.countDocuments.mockResolvedValueOnce(15);
      mockProductModel.countDocuments.mockResolvedValueOnce(8);
      mockProductModel.aggregate
        .mockResolvedValueOnce([
          {
            lowStockProducts: 2,
            outOfStockProducts: 1,
            inventoryCostValue: 500000,
            inventoryRetailValue: 820000,
          },
        ])
        .mockResolvedValueOnce([
          {
            productId: 'prod-low-1',
            name: 'Whisky 12 Años',
            stock: 2,
            lowStockThreshold: 5,
            price: 165000,
            costPrice: 110000,
            available: true,
          },
        ]);

      const result = await service.getDashboardSummary();

      expect(result.kpis).toEqual({
        totalRevenue: 120000,
        totalCost: 75000,
        netProfit: 45000,
        profitMargin: 37.5,
        totalUnitsSold: 6,
        totalOrders: 5,
        paidOrdersCount: 4,
        averageOrderValue: 30000,
        totalUsers: 15,
        activeProducts: 8,
        lowStockProducts: 2,
        outOfStockProducts: 1,
        inventoryCostValue: 500000,
        inventoryRetailValue: 820000,
      });
      expect(result.ordersByStatus).toEqual({
        [OrderStatus.DELIVERED]: 4,
        [OrderStatus.PENDING]: 1,
      });
      expect(result.inventoryAlerts).toHaveLength(1);
    });

    it('debe retornar valores en 0 cuando aún no hay órdenes pagadas', async () => {
      mockOrderModel.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockUserModel.countDocuments.mockResolvedValueOnce(1);
      mockProductModel.countDocuments.mockResolvedValueOnce(0);
      mockProductModel.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getDashboardSummary();

      expect(result.kpis.totalRevenue).toBe(0);
      expect(result.kpis.totalCost).toBe(0);
      expect(result.kpis.netProfit).toBe(0);
      expect(result.kpis.profitMargin).toBe(0);
      expect(result.kpis.totalOrders).toBe(0);
      expect(result.kpis.averageOrderValue).toBe(0);
      expect(result.inventoryAlerts).toEqual([]);
    });

    it('debe filtrar por mes exacto (YYYY-MM) y arrastrar deudas de déficit, cobros pendientes e inventario del mes anterior', async () => {
      mockOrderModel.aggregate
        .mockResolvedValueOnce([
          {
            totalRevenue: 200000,
            totalCost: 120000,
            netProfit: 80000,
            totalUnitsSold: 8,
            paidOrdersCount: 5,
            averageOrderValue: 40000,
          },
        ])
        .mockResolvedValueOnce([{ _id: OrderStatus.DELIVERED, count: 5 }])
        // priorMonthlyProfits: sept ganó +100k (no deja deuda), oct perdió -35k (arrastra 35k a nov)
        .mockResolvedValueOnce([
          { _id: '2026-09', monthlyProfit: 100000 },
          { _id: '2026-10', monthlyProfit: -35000 },
        ])
        // priorPendingOrders: 2 pedidos sin pagar de meses anteriores
        .mockResolvedValueOnce([
          { pendingReceivablesAmount: 95000, pendingReceivablesCount: 2 },
        ]);
      mockUserModel.countDocuments.mockResolvedValueOnce(20);
      mockProductModel.countDocuments.mockResolvedValueOnce(10);
      mockProductModel.aggregate
        .mockResolvedValueOnce([
          {
            lowStockProducts: 1,
            outOfStockProducts: 0,
            inventoryCostValue: 640000,
            inventoryRetailValue: 980000,
            carriedInventoryUnits: 42,
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.getDashboardSummary(
        undefined,
        undefined,
        undefined,
        '2026-11',
      );

      expect(result.period.month).toBe('2026-11');
      expect(result.kpis.netProfit).toBe(80000);
      expect(result.carryOver).toEqual({
        previousDeficitDebt: 35000,
        adjustedNetBalance: 45000,
        closingDeficitDebt: 0,
        pendingReceivablesAmount: 95000,
        pendingReceivablesCount: 2,
        inventoryCostValue: 640000,
        inventoryRetailValue: 980000,
        carriedInventoryUnits: 42,
      });

      const firstPipeline = mockOrderModel.aggregate.mock.calls[0][0];
      expect(firstPipeline[0].$match.createdAt.$gte.toISOString()).toBe(
        '2026-11-01T00:00:00.000Z',
      );
      expect(firstPipeline[0].$match.createdAt.$lte.toISOString()).toBe(
        '2026-11-30T23:59:59.999Z',
      );

      // Verifica que el pipeline descuenta deliveryFee para aislar ventas/ganancia de productos
      const pipelineJson = JSON.stringify(firstPipeline);
      expect(pipelineJson).toContain('$deliveryFee');
      expect(pipelineJson).toContain('_productRevenue');
    });
  });

  describe('getTopProducts', () => {
    it('debe retornar el ranking de productos con costos y ganancia real', async () => {
      const mockTop = [
        {
          productId: 'prod1',
          name: 'Whisky 12 Años',
          totalQuantitySold: 5,
          totalRevenue: 825000,
          totalCost: 550000,
          totalProfit: 275000,
          profitMargin: 33.3,
          avgUnitPrice: 165000,
          avgUnitCost: 110000,
          currentStock: 4,
          lowStockThreshold: 5,
          ordersCount: 4,
        },
      ];
      mockOrderModel.aggregate.mockResolvedValueOnce(mockTop);

      const result = await service.getTopProducts(5, 30);

      expect(mockOrderModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual(mockTop);
    });
  });

  describe('getSalesByDay', () => {
    it('debe retornar ventas, costos y ganancia diaria de los últimos N días', async () => {
      const mockDaily = [
        {
          date: '2026-10-18',
          ordersCount: 3,
          unitsSold: 6,
          dailyRevenue: 90000,
          dailyCost: 54000,
          dailyProfit: 36000,
        },
      ];
      mockOrderModel.aggregate.mockResolvedValueOnce(mockDaily);

      const result = await service.getSalesByDay(7);

      expect(mockOrderModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual(mockDaily);
    });

    it('debe aceptar rango explícito from y to en getSalesByDay', async () => {
      mockOrderModel.aggregate.mockResolvedValueOnce([]);

      await service.getSalesByDay(30, '2026-11-01', '2026-11-15');

      const pipeline = mockOrderModel.aggregate.mock.calls[0][0];
      expect(pipeline[0].$match.createdAt.$gte).toBeInstanceOf(Date);
      expect(pipeline[0].$match.createdAt.$lte).toBeInstanceOf(Date);
    });

    it('debe filtrar exactamente por mes YYYY-MM en getSalesByDay', async () => {
      mockOrderModel.aggregate.mockResolvedValueOnce([]);

      await service.getSalesByDay(30, undefined, undefined, '2026-10');

      const pipeline = mockOrderModel.aggregate.mock.calls[0][0];
      expect(pipeline[0].$match.createdAt.$gte.toISOString()).toBe(
        '2026-10-01T00:00:00.000Z',
      );
      expect(pipeline[0].$match.createdAt.$lte.toISOString()).toBe(
        '2026-10-31T23:59:59.999Z',
      );
    });
  });
});
