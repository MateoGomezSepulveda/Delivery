import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { getModelToken } from '@nestjs/mongoose';
import { Review } from './schemas/review.schema';
import { Order } from '../orders/schemas/order.schema';
import { OrderStatus } from '../orders/order-status.enum';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';

describe('ReviewsService', () => {
  let service: ReviewsService;

  const mockUserId = new Types.ObjectId().toString();
  const mockProductId = new Types.ObjectId().toString();
  const mockOrderId = new Types.ObjectId().toString();
  const mockReviewId = new Types.ObjectId().toString();

  const mockReview = {
    _id: mockReviewId,
    user: new Types.ObjectId(mockUserId),
    product: new Types.ObjectId(mockProductId),
    order: new Types.ObjectId(mockOrderId),
    rating: 5,
    comment: 'Excelente producto',
    save: jest.fn().mockResolvedValue({
      _id: mockReviewId,
      rating: 5,
      comment: 'Excelente producto',
    }),
    deleteOne: jest.fn().mockResolvedValue(true),
  };

  class MockReviewModel {
    save: jest.Mock;
    constructor(public data?: any) {
      this.save = jest.fn().mockResolvedValue({ ...data, _id: mockReviewId });
    }

    static find = jest.fn().mockReturnThis();
    static findOne = jest.fn();
    static findById = jest.fn();
    static populate = jest.fn().mockReturnThis();
    static sort = jest.fn().mockReturnThis();
    static exec = jest.fn();
  }

  const mockOrderModel = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: getModelToken(Review.name),
          useValue: MockReviewModel,
        },
        {
          provide: getModelToken(Order.name),
          useValue: mockOrderModel,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      product: mockProductId,
      order: mockOrderId,
      rating: 5,
      comment: 'Excelente producto',
    };

    it('debe crear una reseña exitosamente cuando la orden está DELIVERED', async () => {
      mockOrderModel.findById.mockResolvedValueOnce({
        _id: mockOrderId,
        userId: mockUserId,
        status: OrderStatus.DELIVERED,
        items: [{ productId: mockProductId }],
      });
      MockReviewModel.findOne.mockResolvedValueOnce(null);

      const result = await service.create(mockUserId, createDto);

      expect(result).toBeDefined();
      expect(result.rating).toBe(5);
    });

    it('debe lanzar NotFoundException si la orden no existe', async () => {
      mockOrderModel.findById.mockResolvedValueOnce(null);

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar ForbiddenException si la orden pertenece a otro usuario', async () => {
      mockOrderModel.findById.mockResolvedValueOnce({
        _id: mockOrderId,
        userId: new Types.ObjectId().toString(),
        status: OrderStatus.DELIVERED,
      });

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('debe lanzar BadRequestException si la orden no está en estado DELIVERED', async () => {
      mockOrderModel.findById.mockResolvedValueOnce({
        _id: mockOrderId,
        userId: mockUserId,
        status: OrderStatus.PENDING,
      });

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar BadRequestException si el producto no pertenece a la orden', async () => {
      mockOrderModel.findById.mockResolvedValueOnce({
        _id: mockOrderId,
        userId: mockUserId,
        status: OrderStatus.DELIVERED,
        items: [{ productId: new Types.ObjectId().toString() }],
      });

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar ConflictException si ya existe una reseña para ese producto en esa orden', async () => {
      mockOrderModel.findById.mockResolvedValueOnce({
        _id: mockOrderId,
        userId: mockUserId,
        status: OrderStatus.DELIVERED,
        items: [{ productId: mockProductId }],
      });
      MockReviewModel.findOne.mockResolvedValueOnce(mockReview);

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findByProduct', () => {
    it('debe retornar la lista de reseñas de un producto', async () => {
      MockReviewModel.exec.mockResolvedValueOnce([mockReview]);

      const result = await service.findByProduct(mockProductId);

      expect(result).toEqual([mockReview]);
    });

    it('debe lanzar BadRequestException si el productId no es un ObjectId válido', async () => {
      await expect(service.findByProduct('id-invalido')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('debe eliminar la reseña si el usuario es el autor', async () => {
      MockReviewModel.findById.mockResolvedValueOnce(mockReview);

      const result = await service.remove(mockReviewId, mockUserId, 'USER');

      expect(mockReview.deleteOne).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Reseña eliminada correctamente.' });
    });

    it('debe permitir eliminar la reseña si el usuario es ADMIN', async () => {
      MockReviewModel.findById.mockResolvedValueOnce(mockReview);
      const adminId = new Types.ObjectId().toString();

      const result = await service.remove(mockReviewId, adminId, 'ADMIN');

      expect(mockReview.deleteOne).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Reseña eliminada correctamente.' });
    });

    it('debe lanzar NotFoundException si la reseña no existe', async () => {
      MockReviewModel.findById.mockResolvedValueOnce(null);

      await expect(service.remove(mockReviewId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar ForbiddenException si otro usuario no-admin intenta eliminarla', async () => {
      MockReviewModel.findById.mockResolvedValueOnce(mockReview);
      const otherUserId = new Types.ObjectId().toString();

      await expect(
        service.remove(mockReviewId, otherUserId, 'USER'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
