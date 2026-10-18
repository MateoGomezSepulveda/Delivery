import { Test, TestingModule } from '@nestjs/testing';
import { CouponsService } from './coupons.service';
import { getModelToken } from '@nestjs/mongoose';
import { Coupon, DiscountType } from './schemas/coupon.schema';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';

describe('CouponsService', () => {
  let service: CouponsService;

  const mockCouponId = new Types.ObjectId().toString();
  const mockUserId = new Types.ObjectId().toString();

  const futureDate = new Date(Date.now() + 86400000 * 30).toISOString();
  const pastDate = new Date(Date.now() - 86400000 * 5).toISOString();

  const createMockCouponDoc = (overrides: any = {}) => ({
    _id: mockCouponId,
    code: 'BIENVENIDA20',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 20,
    minOrderAmount: 10000,
    maxDiscountAmount: 15000,
    expirationDate: new Date(futureDate),
    usageLimit: 10,
    usedCount: 0,
    usedBy: [],
    isActive: true,
    save: jest.fn().mockImplementation(function () {
      return Promise.resolve(this);
    }),
    deleteOne: jest.fn().mockResolvedValue(true),
    ...overrides,
  });

  class MockCouponModel {
    constructor(public data?: any) {}
    save = jest.fn().mockImplementation(function () {
      return Promise.resolve({ ...this.data, _id: mockCouponId });
    });

    static find = jest.fn().mockReturnThis();
    static findOne = jest.fn();
    static findById = jest.fn();
    static sort = jest.fn().mockReturnThis();
    static exec = jest.fn();
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        {
          provide: getModelToken(Coupon.name),
          useValue: MockCouponModel,
        },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debe crear un cupón normalizando el código a mayúsculas', async () => {
      MockCouponModel.findOne.mockResolvedValueOnce(null);

      const result = await service.create({
        code: ' promo10 ',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        expirationDate: futureDate,
      });

      expect(result.code).toBe('PROMO10');
    });

    it('debe lanzar BadRequestException si el porcentaje supera 100%', async () => {
      await expect(
        service.create({
          code: 'INVALIDO',
          discountType: DiscountType.PERCENTAGE,
          discountValue: 150,
          expirationDate: futureDate,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar ConflictException si el código ya existe', async () => {
      MockCouponModel.findOne.mockResolvedValueOnce(createMockCouponDoc());

      await expect(
        service.create({
          code: 'BIENVENIDA20',
          discountType: DiscountType.PERCENTAGE,
          discountValue: 20,
          expirationDate: futureDate,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll & findOne', () => {
    it('debe retornar todos los cupones', async () => {
      const mockDoc = createMockCouponDoc();
      MockCouponModel.exec.mockResolvedValueOnce([mockDoc]);

      const result = await service.findAll();
      expect(result).toEqual([mockDoc]);
    });

    it('debe retornar un cupón por ID', async () => {
      const mockDoc = createMockCouponDoc();
      MockCouponModel.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockDoc),
      });

      const result = await service.findOne(mockCouponId);
      expect(result).toEqual(mockDoc);
    });

    it('debe lanzar NotFoundException si el cupón no existe', async () => {
      MockCouponModel.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      });

      await expect(service.findOne(mockCouponId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update & remove', () => {
    it('debe actualizar un cupón correctamente', async () => {
      const mockDoc = createMockCouponDoc();
      jest.spyOn(service, 'findOne').mockResolvedValueOnce(mockDoc as any);
      MockCouponModel.findOne.mockResolvedValueOnce(null);

      const result = await service.update(mockCouponId, {
        code: 'nuevo25',
        discountValue: 25,
      });

      expect(result.code).toBe('NUEVO25');
      expect(result.discountValue).toBe(25);
      expect(mockDoc.save).toHaveBeenCalled();
    });

    it('debe eliminar un cupón correctamente', async () => {
      const mockDoc = createMockCouponDoc();
      jest.spyOn(service, 'findOne').mockResolvedValueOnce(mockDoc as any);

      const result = await service.remove(mockCouponId);
      expect(mockDoc.deleteOne).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Cupón eliminado correctamente.' });
    });
  });

  describe('applyCoupon', () => {
    it('debe aplicar descuento porcentual respetando el tope máximo', async () => {
      const mockDoc = createMockCouponDoc({
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        maxDiscountAmount: 5000,
      });
      MockCouponModel.findOne.mockResolvedValueOnce(mockDoc);

      // 20% de 50,000 es 10,000, pero el tope máximo es 5,000
      const result = await service.applyCoupon(mockUserId, {
        code: 'bienvenida20',
        orderTotal: 50000,
      });

      expect(result.discountAmount).toBe(5000);
      expect(result.finalTotal).toBe(45000);
      expect(mockDoc.usedCount).toBe(1);
      expect(mockDoc.save).toHaveBeenCalled();
    });

    it('debe aplicar descuento de monto fijo (FIXED) sin bajar de 0', async () => {
      const mockDoc = createMockCouponDoc({
        discountType: DiscountType.FIXED,
        discountValue: 15000,
        minOrderAmount: 0,
      });
      MockCouponModel.findOne.mockResolvedValueOnce(mockDoc);

      const result = await service.applyCoupon(mockUserId, {
        code: 'BIENVENIDA20',
        orderTotal: 12000,
      });

      expect(result.discountAmount).toBe(12000);
      expect(result.finalTotal).toBe(0);
    });

    it('debe fallar si el cupón está expirado', async () => {
      const mockDoc = createMockCouponDoc({
        expirationDate: new Date(pastDate),
      });
      MockCouponModel.findOne.mockResolvedValueOnce(mockDoc);

      await expect(
        service.applyCoupon(mockUserId, {
          code: 'BIENVENIDA20',
          orderTotal: 30000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe fallar si el usuario ya usó el cupón o no alcanza el monto mínimo', async () => {
      const mockDoc = createMockCouponDoc({
        minOrderAmount: 50000,
      });
      MockCouponModel.findOne.mockResolvedValueOnce(mockDoc);

      await expect(
        service.applyCoupon(mockUserId, {
          code: 'BIENVENIDA20',
          orderTotal: 20000,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
