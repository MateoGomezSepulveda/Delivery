import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { DeliveryService } from './delivery.service';
import {
  DeliveryProfile,
  DeliveryProfileStatus,
  VehicleType,
} from './schemas/delivery-profile.schema';
import { Order } from 'src/orders/schemas/order.schema';
import { OrderStatus } from 'src/orders/order-status.enum';
import {
  PaymentMethod,
  PaymentStatus,
} from 'src/orders/payment-method.enum';
import { EventsGateway } from 'src/events/events/events.gateway';
import { UsersService } from 'src/users/users.service';
import { Role } from 'src/auth/roles.enum';

describe('DeliveryService', () => {
  let service: DeliveryService;

  const mockDeliveryProfileModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
  };

  const mockOrderModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockEventsGateway = {
    emitOrderStatusUpdate: jest.fn(),
    emitDeliveryLocationUpdate: jest.fn(),
    emitNewAvailableOrder: jest.fn(),
    emitOrderTaken: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
    changeRole: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        {
          provide: getModelToken(DeliveryProfile.name),
          useValue: mockDeliveryProfileModel,
        },
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: EventsGateway, useValue: mockEventsGateway },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<DeliveryService>(DeliveryService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProfile & Admin approval', () => {
    it('crea solicitud en estado PENDING para CLIENT sin promover automáticamente a DELIVERY', async () => {
      mockDeliveryProfileModel.findOne.mockResolvedValueOnce(null);
      mockUsersService.findOne.mockResolvedValueOnce({
        _id: 'u-client',
        role: Role.CLIENT,
        phone: '+573001112233',
      });
      mockDeliveryProfileModel.create.mockImplementationOnce(async (doc) => ({
        _id: 'prof-1',
        ...doc,
      }));

      const res = await service.createProfile('u-client', {
        vehicleType: VehicleType.MOTO,
        plate: 'ABC-123',
      });

      expect(res.status).toBe(DeliveryProfileStatus.PENDING);
      expect(res.licensePlate).toBe('ABC-123');
      expect(res.phone).toBe('+573001112233');
      expect(mockUsersService.changeRole).not.toHaveBeenCalled();
    });

    it('rechaza duplicado si ya existe perfil PENDING o APPROVED', async () => {
      mockDeliveryProfileModel.findOne.mockResolvedValueOnce({
        _id: 'prof-1',
        status: DeliveryProfileStatus.PENDING,
      });

      await expect(
        service.createProfile('u-client', { vehicleType: VehicleType.MOTO }),
      ).rejects.toThrow(ConflictException);
    });

    it('promueve a Role.DELIVERY cuando el Admin aprueba la solicitud', async () => {
      const saveMock = jest.fn().mockResolvedValue(true);
      const profileDoc = {
        _id: 'prof-1',
        userId: { toString: () => 'u-client' },
        status: DeliveryProfileStatus.PENDING,
        isAvailable: false,
        save: saveMock,
      };
      mockDeliveryProfileModel.findById
        .mockResolvedValueOnce(profileDoc)
        .mockReturnValueOnce({
          populate: jest.fn().mockResolvedValue({
            ...profileDoc,
            status: DeliveryProfileStatus.APPROVED,
          }),
        });
      mockUsersService.findOne.mockResolvedValueOnce({
        _id: 'u-client',
        role: Role.CLIENT,
      });

      const res = await service.reviewProfileStatus(
        'prof-1',
        DeliveryProfileStatus.APPROVED,
      );

      expect(profileDoc.status).toBe(DeliveryProfileStatus.APPROVED);
      expect(mockUsersService.changeRole).toHaveBeenCalledWith(
        'u-client',
        Role.DELIVERY,
      );
      expect(saveMock).toHaveBeenCalled();
      expect(res.status).toBe(DeliveryProfileStatus.APPROVED);
    });

    it('rechaza solicitud y guarda rejectionReason sin promover a DELIVERY', async () => {
      const saveMock = jest.fn().mockResolvedValue(true);
      const profileDoc = {
        _id: 'prof-2',
        userId: { toString: () => 'u-client' },
        status: DeliveryProfileStatus.PENDING,
        isAvailable: true,
        rejectionReason: undefined as string | undefined,
        save: saveMock,
      };
      mockDeliveryProfileModel.findById
        .mockResolvedValueOnce(profileDoc)
        .mockReturnValueOnce({
          populate: jest.fn().mockResolvedValue({
            ...profileDoc,
            status: DeliveryProfileStatus.REJECTED,
          }),
        });
      mockUsersService.findOne.mockResolvedValueOnce({
        _id: 'u-client',
        role: Role.CLIENT,
      });

      await service.reviewProfileStatus(
        'prof-2',
        DeliveryProfileStatus.REJECTED,
        'Falta placa',
      );

      expect(profileDoc.status).toBe(DeliveryProfileStatus.REJECTED);
      expect(profileDoc.isAvailable).toBe(false);
      expect(profileDoc.rejectionReason).toBe('Falta placa');
      expect(mockUsersService.changeRole).not.toHaveBeenCalled();
    });
  });

  describe('acceptOrder', () => {
    it('rechaza aceptar pedido si el repartidor está Offline (isAvailable === false)', async () => {
      mockDeliveryProfileModel.findOne.mockResolvedValueOnce({
        _id: 'prof-1',
        status: DeliveryProfileStatus.APPROVED,
        isAvailable: false,
      });

      await expect(service.acceptOrder('rider-1', 'order-1')).rejects.toThrow(
        new BadRequestException(
          'Debes activar tu estado a Disponible para aceptar pedidos',
        ),
      );
      expect(mockOrderModel.findById).not.toHaveBeenCalled();
    });

    it('acepta pedido CONFIRMED cuando el repartidor está Online y emite eventos en vivo', async () => {
      mockDeliveryProfileModel.findOne.mockResolvedValueOnce({
        _id: 'prof-1',
        status: DeliveryProfileStatus.APPROVED,
        isAvailable: true,
      });
      mockOrderModel.findById.mockResolvedValueOnce({
        _id: 'order-confirmed-1',
        status: OrderStatus.CONFIRMED,
        deliveryId: null,
      });
      const updatedOrder = {
        _id: { toString: () => 'order-confirmed-1' },
        userId: { toString: () => 'client-1' },
        deliveryId: 'rider-1',
        status: OrderStatus.OUT_FOR_DELIVERY,
      };
      mockOrderModel.findOneAndUpdate.mockResolvedValueOnce(updatedOrder);

      const res = await service.acceptOrder('rider-1', 'order-confirmed-1');

      expect(res).toEqual(updatedOrder);
      expect(mockEventsGateway.emitOrderStatusUpdate).toHaveBeenCalledWith(
        'client-1',
        updatedOrder,
      );
      expect(mockEventsGateway.emitOrderTaken).toHaveBeenCalledWith(
        'order-confirmed-1',
        'rider-1',
      );
    });

    it('acepta pedido cuando el repartidor está Online y emite order_status_updated + order_taken', async () => {
      mockDeliveryProfileModel.findOne.mockResolvedValueOnce({
        _id: 'prof-1',
        status: DeliveryProfileStatus.APPROVED,
        isAvailable: true,
      });
      mockOrderModel.findById.mockResolvedValueOnce({
        _id: 'order-1',
        status: OrderStatus.PREPARING,
        deliveryId: null,
      });
      const updatedOrder = {
        _id: { toString: () => 'order-1' },
        userId: { toString: () => 'client-1' },
        deliveryId: 'rider-1',
        status: OrderStatus.OUT_FOR_DELIVERY,
      };
      mockOrderModel.findOneAndUpdate.mockResolvedValueOnce(updatedOrder);

      const res = await service.acceptOrder('rider-1', 'order-1');

      expect(res).toEqual(updatedOrder);
      expect(mockEventsGateway.emitOrderStatusUpdate).toHaveBeenCalledWith(
        'client-1',
        updatedOrder,
      );
      expect(mockEventsGateway.emitOrderTaken).toHaveBeenCalledWith(
        'order-1',
        'rider-1',
      );
    });

    it('lanza NotFoundException si el pedido no existe', async () => {
      mockDeliveryProfileModel.findOne.mockResolvedValueOnce({
        _id: 'prof-1',
        status: DeliveryProfileStatus.APPROVED,
        isAvailable: true,
      });
      mockOrderModel.findById.mockResolvedValueOnce(null);

      await expect(
        service.acceptOrder('rider-1', 'missing-order'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMyStats & getOrderHistory', () => {
    it('calcula entregas totales, de hoy, valor recaudado y ganancias estimadas', async () => {
      const now = new Date();
      const oldDate = new Date('2025-01-10T10:00:00Z');
      mockOrderModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { total: 80000, updatedAt: now },
            { total: 30000, updatedAt: oldDate },
          ]),
        }),
      });
      mockOrderModel.countDocuments.mockResolvedValueOnce(1);

      const stats = await service.getMyStats('rider-1');

      expect(stats).toEqual({
        delivered: 2,
        inProgress: 1,
        deliveredToday: 1,
        totalOrderValue: 110000,
        estimatedEarnings: 13000, // max(5000, 8000) + max(5000, 3000)
      });
    });

    it('retorna historial paginado de entregas con teléfono del cliente y ganancia', async () => {
      const mockOrders = [
        {
          _id: 'ord-1',
          total: 90000,
          address: 'Calle 10 # 5-20',
          toObject: () => ({
            _id: 'ord-1',
            total: 90000,
            address: 'Calle 10 # 5-20',
          }),
        },
      ];
      mockOrderModel.find.mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockOrders),
      });
      mockOrderModel.countDocuments.mockResolvedValueOnce(1);

      const history = await service.getOrderHistory('rider-1', 1, 10);

      expect(history.data).toHaveLength(1);
      expect(history.data[0].riderEarning).toBe(9000);
      expect(history.meta).toEqual({ total: 1, page: 1, lastPage: 1 });
    });
  });

  describe('deliverOrder (cobro contraentrega)', () => {
    it('marca paymentStatus = PAID y paidAt cuando entrega un pedido CASH_ON_DELIVERY', async () => {
      mockOrderModel.findById.mockResolvedValueOnce({
        _id: 'ord-cash-1',
        deliveryId: { toString: () => 'rider-1' },
        status: OrderStatus.OUT_FOR_DELIVERY,
        paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
        paymentStatus: PaymentStatus.PENDING,
        paidAt: null,
      });
      const updatedOrder = {
        _id: 'ord-cash-1',
        userId: { toString: () => 'client-1' },
        status: OrderStatus.DELIVERED,
        paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
        paymentStatus: PaymentStatus.PAID,
      };
      mockOrderModel.findByIdAndUpdate.mockResolvedValueOnce(updatedOrder);

      const res = await service.deliverOrder('rider-1', 'ord-cash-1');

      expect(mockOrderModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'ord-cash-1',
        expect.objectContaining({
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.PAID,
          paidAt: expect.any(Date),
        }),
        { new: true },
      );
      expect(res?.paymentStatus).toBe(PaymentStatus.PAID);
      expect(mockEventsGateway.emitOrderStatusUpdate).toHaveBeenCalledWith(
        'client-1',
        updatedOrder,
      );
    });
  });
});
