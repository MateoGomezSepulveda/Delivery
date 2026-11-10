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
    it('debe calcular los KPIs y el desglose por estado correctamente', async () => {
      mockOrderModel.aggregate
        .mockResolvedValueOnce([
          {
            totalRevenue: 120000,
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

      const result = await service.getDashboardSummary();

      expect(result.kpis).toEqual({
        totalRevenue: 120000,
        totalOrders: 5,
        paidOrdersCount: 4,
        averageOrderValue: 30000,
        totalUsers: 15,
        activeProducts: 8,
      });
      expect(result.ordersByStatus).toEqual({
        [OrderStatus.DELIVERED]: 4,
        [OrderStatus.PENDING]: 1,
      });
    });

    it('debe retornar valores en 0 cuando aún no hay órdenes pagadas', async () => {
      mockOrderModel.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockUserModel.countDocuments.mockResolvedValueOnce(1);
      mockProductModel.countDocuments.mockResolvedValueOnce(0);

      const result = await service.getDashboardSummary();

      expect(result.kpis.totalRevenue).toBe(0);
      expect(result.kpis.totalOrders).toBe(0);
      expect(result.kpis.averageOrderValue).toBe(0);
    });
  });

  describe('getTopProducts', () => {
    it('debe retornar el ranking de productos más vendidos', async () => {
      const mockTop = [
        {
          productId: 'prod1',
          name: 'Pizza Margarita',
          totalQuantitySold: 25,
          totalRevenue: 500000,
          ordersCount: 18,
        },
      ];
      mockOrderModel.aggregate.mockResolvedValueOnce(mockTop);

      const result = await service.getTopProducts(5);

      expect(mockOrderModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual(mockTop);
    });
  });

  describe('getSalesByDay', () => {
    it('debe retornar las ventas diarias de los últimos N días', async () => {
      const mockDaily = [
        { date: '2026-10-18', ordersCount: 3, dailyRevenue: 90000 },
      ];
      mockOrderModel.aggregate.mockResolvedValueOnce(mockDaily);

      const result = await service.getSalesByDay(7);

      expect(mockOrderModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual(mockDaily);
    });
  });
});
