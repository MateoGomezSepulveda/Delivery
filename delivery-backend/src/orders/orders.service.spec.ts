import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { getModelToken } from '@nestjs/mongoose';
import { Order } from './schemas/order.schema';
import { CartService } from 'src/cart/cart.service';
import { PaymentsService } from 'src/payments/payments.service';
import { UsersService } from 'src/users/users.service';
import { MailService } from 'src/mail/mail.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { CouponsService } from 'src/coupons/coupons.service';
import { ProductsService } from 'src/products/products.service';
import { EventsGateway } from '../events/events/events.gateway';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus } from './order-status.enum';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockUserId = '64a000000000000000000001';
const mockOrderId = '64a000000000000000000099';

const mockCartItems = [
  {
    productId: { _id: '64a000000000000000000010', name: 'Pizza' },
    quantity: 2,
    price: 15000,
  },
];

const mockCart = {
  items: mockCartItems,
  total: 30000,
  status: 'ACTIVE',
  save: jest.fn().mockResolvedValue(true),
};

const mockOrder = {
  _id: mockOrderId,
  userId: mockUserId,
  items: [],
  total: 30000,
  address: 'Calle 123',
  status: OrderStatus.PENDING,
  createdAt: new Date(),
  save: jest
    .fn()
    .mockResolvedValue({ _id: mockOrderId, status: OrderStatus.PENDING }),
};

// ── Mock del Modelo Mongoose ──────────────────────────────────────────────────

const mockOrderModel = {
  find: jest.fn(),
  findById: jest.fn(),
  countDocuments: jest.fn(),
  // constructor para 'new this.orderModel(...)'
  prototype: { save: jest.fn() },
};

function MockOrderModel(data: any) {
  return { ...data, save: jest.fn().mockResolvedValue(data) };
}
Object.assign(MockOrderModel, mockOrderModel);

const mockCartService = {
  getActiveCart: jest.fn().mockResolvedValue(mockCart),
};

const mockUsersService = {
  findOne: jest.fn().mockResolvedValue({
    email: 'test@test.com',
    role: 'CLIENT',
    phone: '+573001234567',
    fcmTokens: [],
  }),
};

const mockCouponsService = {
  redeemCoupon: jest.fn(),
  releaseCoupon: jest.fn(),
};

const mockProductsService = {
  reserveStockForOrder: jest.fn(),
  restoreStockForOrder: jest.fn(),
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: MockOrderModel },
        { provide: CartService, useValue: mockCartService },
        {
          provide: PaymentsService,
          useValue: { createPreference: jest.fn(), verifyPayment: jest.fn() },
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        { provide: MailService, useValue: { sendOrderStatusEmail: jest.fn() } },
        {
          provide: NotificationsService,
          useValue: { sendOrderStatusPush: jest.fn() },
        },
        {
          provide: EventsGateway,
          useValue: { emitOrderStatusUpdate: jest.fn() },
        },
        {
          provide: CouponsService,
          useValue: mockCouponsService,
        },
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
    mockUsersService.findOne.mockResolvedValue({
      email: 'test@test.com',
      role: 'CLIENT',
      phone: '+573001234567',
      fcmTokens: [],
    });
    mockProductsService.reserveStockForOrder.mockResolvedValue(
      new Map([
        [
          '64a000000000000000000010',
          {
            productId: '64a000000000000000000010',
            costPrice: 9000,
            remainingStock: 8,
          },
        ],
      ]),
    );
    mockProductsService.restoreStockForOrder.mockResolvedValue(undefined);
  });

  // ── createOrder ─────────────────────────────────────────────────────────────

  describe('createOrder', () => {
    it('debe crear el pedido, reservar stock, guardar costPrice y calcular ganancia real', async () => {
      mockCartService.getActiveCart.mockResolvedValue({ ...mockCart });

      const result = await service.createOrder(mockUserId, 'Calle 123');

      expect(mockCartService.getActiveCart).toHaveBeenCalledWith(mockUserId);
      expect(mockProductsService.reserveStockForOrder).toHaveBeenCalledWith([
        {
          productId: '64a000000000000000000010',
          quantity: 2,
          name: 'Pizza',
        },
      ]);
      expect(result).toBeDefined();
      expect((result as any).totalCost).toBe(18000);
      expect((result as any).netProfit).toBe(12000);
      expect((result as any).items[0].costPrice).toBe(9000);
    });

    it('debe restaurar el stock si falla la redención de cupón después de reservar', async () => {
      mockCartService.getActiveCart.mockResolvedValue({ ...mockCart });
      mockCouponsService.redeemCoupon.mockRejectedValueOnce(
        new BadRequestException('Cupón inválido'),
      );

      await expect(
        service.createOrder(mockUserId, 'Calle 123', 'INVALIDO'),
      ).rejects.toThrow(BadRequestException);

      expect(mockProductsService.restoreStockForOrder).toHaveBeenCalledWith([
        { productId: '64a000000000000000000010', quantity: 2 },
      ]);
    });

    it('debe rechazar createOrder con PHONE_REQUIRED si el usuario no tiene número de celular registrado', async () => {
      mockUsersService.findOne.mockResolvedValueOnce({
        email: 'google-user@gmail.com',
        role: 'CLIENT',
        phone: undefined,
      });

      await expect(
        service.createOrder(mockUserId, 'Calle 123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si el carrito está vacío', async () => {
      mockCartService.getActiveCart.mockResolvedValue({
        items: [],
        total: 0,
        save: jest.fn(),
      });

      await expect(
        service.createOrder(mockUserId, 'Calle 123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe aplicar y persistir el cupón promocional en la orden creada', async () => {
      mockCartService.getActiveCart.mockResolvedValue({ ...mockCart });
      mockCouponsService.redeemCoupon.mockResolvedValue({
        code: 'BIENVENIDA20',
        discountAmount: 6000,
        finalTotal: 24000,
      });

      const result = await service.createOrder(
        mockUserId,
        'Calle 123',
        'bienvenida20',
      );

      expect(mockCouponsService.redeemCoupon).toHaveBeenCalledWith(
        mockUserId,
        'bienvenida20',
        30000,
      );
      expect(result.couponCode).toBe('BIENVENIDA20');
      expect(result.couponDiscount).toBe(6000);
      expect(result.total).toBe(24000);
    });

    it('debe consultar el cupo mensual de descuento del repartidor respetando el tope de 4 pedidos', async () => {
      mockUsersService.findOne.mockResolvedValue({
        _id: mockUserId,
        role: 'DELIVERY',
      });
      mockOrderModel.countDocuments.mockResolvedValueOnce(4);

      const exhausted = await service.getRiderDiscountQuota(mockUserId);
      expect(exhausted).toEqual(
        expect.objectContaining({
          isRider: true,
          eligible: false,
          usedThisMonth: 4,
          remaining: 0,
        }),
      );

      mockOrderModel.countDocuments.mockResolvedValueOnce(2);
      const available = await service.getRiderDiscountQuota(mockUserId);
      expect(available).toEqual(
        expect.objectContaining({
          isRider: true,
          eligible: true,
          usedThisMonth: 2,
          remaining: 2,
        }),
      );
    });
  });

  // ── findMyOrders ────────────────────────────────────────────────────────────

  describe('findMyOrders', () => {
    it('debe retornar pedidos paginados del usuario', async () => {
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([mockOrder]),
      };
      mockOrderModel.find.mockReturnValue(mockQuery);
      mockOrderModel.countDocuments.mockResolvedValue(1);

      const result = await service.findMyOrders(mockUserId, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toBeDefined();
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.lastPage).toBe(1);
    });

    it('debe filtrar por status si se proporciona', async () => {
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      };
      mockOrderModel.find.mockReturnValue(mockQuery);
      mockOrderModel.countDocuments.mockResolvedValue(0);

      const result = await service.findMyOrders(mockUserId, {
        status: OrderStatus.CANCELLED,
      });

      expect(mockOrderModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.CANCELLED }),
      );
      expect(result.meta.total).toBe(0);
    });
  });

  // ── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    const populatedOrder = {
      ...mockOrder,
      userId: { _id: { toString: () => mockUserId } },
    };
    const populateChain = {
      populate: jest.fn().mockReturnThis(),
    };

    it('debe retornar el pedido si el usuario es el dueño', async () => {
      populateChain.populate
        .mockReturnValueOnce(populateChain)
        .mockResolvedValueOnce(populatedOrder);
      mockOrderModel.findById.mockReturnValue(populateChain);

      const user = { role: 'CLIENT', userId: mockUserId };
      const result = await service.findOne(mockOrderId, user);

      expect(result).toEqual(populatedOrder);
    });

    it('debe retornar el pedido si el usuario es ADMIN', async () => {
      populateChain.populate
        .mockReturnValueOnce(populateChain)
        .mockResolvedValueOnce(populatedOrder);
      mockOrderModel.findById.mockReturnValue(populateChain);

      const adminUser = { role: 'ADMIN', userId: 'otro-id' };
      const result = await service.findOne(mockOrderId, adminUser);

      expect(result).toEqual(populatedOrder);
    });

    it('debe lanzar NotFoundException si el pedido no existe', async () => {
      populateChain.populate
        .mockReturnValueOnce(populateChain)
        .mockResolvedValueOnce(null);
      mockOrderModel.findById.mockReturnValue(populateChain);

      await expect(
        service.findOne(mockOrderId, { role: 'CLIENT', userId: mockUserId }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar NotFoundException si el usuario no es el dueño', async () => {
      const otherOrder = {
        ...populatedOrder,
        userId: { _id: { toString: () => 'otro-user-id' } },
      };
      populateChain.populate
        .mockReturnValueOnce(populateChain)
        .mockResolvedValueOnce(otherOrder);
      mockOrderModel.findById.mockReturnValue(populateChain);

      await expect(
        service.findOne(mockOrderId, { role: 'CLIENT', userId: mockUserId }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── cancelOrderByClient ──────────────────────────────────────────────────────

  describe('cancelOrderByClient', () => {
    it('debe cancelar el pedido si está en PENDING y el usuario es el dueño (restaurando stock)', async () => {
      const order = {
        ...mockOrder,
        items: [{ productId: '64a000000000000000000010', quantity: 2 }],
        userId: { toString: () => mockUserId },
      };
      mockOrderModel.findById.mockResolvedValue(order);

      await service.cancelOrderByClient(mockOrderId, mockUserId);

      expect(order.status).toBe(OrderStatus.CANCELLED);
      expect(order.save).toHaveBeenCalled();
      expect(mockProductsService.restoreStockForOrder).toHaveBeenCalledWith(
        order.items,
      );
    });

    it('debe lanzar BadRequestException si el pedido no está en PENDING', async () => {
      const order = {
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
        userId: { toString: () => mockUserId },
      };
      mockOrderModel.findById.mockResolvedValue(order);

      await expect(
        service.cancelOrderByClient(mockOrderId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si el usuario no es el dueño', async () => {
      const order = { ...mockOrder, userId: { toString: () => 'otro-user' } };
      mockOrderModel.findById.mockResolvedValue(order);

      await expect(
        service.cancelOrderByClient(mockOrderId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateStatus ─────────────────────────────────────────────────────────────

  describe('updateStatus (ADMIN)', () => {
    it('debe actualizar el estado con una transición válida', async () => {
      const order = {
        ...mockOrder,
        status: OrderStatus.PENDING,
        save: jest
          .fn()
          .mockResolvedValue({ ...mockOrder, status: OrderStatus.PAID }),
      };
      mockOrderModel.findById.mockResolvedValue(order);

      await service.updateStatus(mockOrderId, OrderStatus.PAID);

      expect(order.status).toBe(OrderStatus.PAID);
      expect(order.save).toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException con una transición inválida', async () => {
      const order = {
        ...mockOrder,
        status: OrderStatus.DELIVERED,
        save: jest.fn(),
      };
      mockOrderModel.findById.mockResolvedValue(order);

      await expect(
        service.updateStatus(mockOrderId, OrderStatus.PENDING),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si el pedido no existe', async () => {
      mockOrderModel.findById.mockResolvedValue(null);

      await expect(
        service.updateStatus(mockOrderId, OrderStatus.CONFIRMED),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar pasar de PREPARING a OUT_FOR_DELIVERY sin repartidor asignado', async () => {
      const order = {
        ...mockOrder,
        status: OrderStatus.PREPARING,
        deliveryId: undefined,
        save: jest.fn(),
      };
      mockOrderModel.findById.mockResolvedValue(order);

      await expect(
        service.updateStatus(mockOrderId, OrderStatus.OUT_FOR_DELIVERY),
      ).rejects.toThrow(BadRequestException);
      expect(order.save).not.toHaveBeenCalled();
    });

    it('debe rechazar asignar un usuario que no tenga rol DELIVERY', async () => {
      const order = {
        ...mockOrder,
        status: OrderStatus.PREPARING,
        deliveryId: undefined,
        save: jest.fn(),
      };
      mockOrderModel.findById.mockResolvedValue(order);
      mockUsersService.findOne.mockResolvedValueOnce({
        _id: '64a000000000000000000055',
        role: 'CLIENT',
      });

      await expect(
        service.updateStatus(
          mockOrderId,
          OrderStatus.OUT_FOR_DELIVERY,
          '64a000000000000000000055',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(order.save).not.toHaveBeenCalled();
    });

    it('debe asignar repartidor DELIVERY válido y permitir pasar a OUT_FOR_DELIVERY', async () => {
      const riderId = '64a000000000000000000077';
      const order = {
        ...mockOrder,
        status: OrderStatus.PREPARING,
        deliveryId: undefined as string | undefined,
        save: jest.fn().mockImplementation(function (this: any) {
          return Promise.resolve({
            ...this,
            userId: mockUserId,
          });
        }),
      };
      mockOrderModel.findById.mockResolvedValue(order);
      mockUsersService.findOne
        .mockResolvedValueOnce({ _id: riderId, role: 'DELIVERY' })
        .mockResolvedValueOnce({
          email: 'client@test.com',
          role: 'CLIENT',
          fcmTokens: [],
        });

      await service.updateStatus(
        mockOrderId,
        OrderStatus.OUT_FOR_DELIVERY,
        riderId,
      );

      expect(order.deliveryId).toBe(riderId);
      expect(order.status).toBe(OrderStatus.OUT_FOR_DELIVERY);
      expect(order.save).toHaveBeenCalled();
    });
  });
});
