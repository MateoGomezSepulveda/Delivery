import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { getModelToken } from '@nestjs/mongoose';
import { Order } from './schemas/order.schema';
import { CartService } from 'src/cart/cart.service';
import { PaymentsService } from 'src/payments/payments.service';
import { UsersService } from 'src/users/users.service';
import { MailService } from 'src/mail/mail.service';
import { NotificationsService } from 'src/notifications/notifications.service';
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

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: MockOrderModel },
        { provide: CartService, useValue: mockCartService },
        { provide: PaymentsService, useValue: { createPreference: jest.fn(), verifyPayment: jest.fn() } },
        { provide: UsersService, useValue: { findOne: jest.fn().mockResolvedValue({ email: 'test@test.com', fcmTokens: [] }) } },
        { provide: MailService, useValue: { sendOrderStatusEmail: jest.fn() } },
        { provide: NotificationsService, useValue: { sendOrderStatusPush: jest.fn() } },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  // ── createOrder ─────────────────────────────────────────────────────────────

  describe('createOrder', () => {
    it('debe crear el pedido y marcar el carrito como CHECKED_OUT', async () => {
      mockCartService.getActiveCart.mockResolvedValue({ ...mockCart });

      const result = await service.createOrder(mockUserId, 'Calle 123');

      expect(mockCartService.getActiveCart).toHaveBeenCalledWith(mockUserId);
      expect(result).toBeDefined();
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
    it('debe cancelar el pedido si está en PENDING y el usuario es el dueño', async () => {
      const order = { ...mockOrder, userId: { toString: () => mockUserId } };
      mockOrderModel.findById.mockResolvedValue(order);

      await service.cancelOrderByClient(mockOrderId, mockUserId);

      expect(order.status).toBe(OrderStatus.CANCELLED);
      expect(order.save).toHaveBeenCalled();
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
        save: jest.fn().mockResolvedValue(true),
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
  });
});
