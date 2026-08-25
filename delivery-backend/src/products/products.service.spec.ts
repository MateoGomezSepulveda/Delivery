import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { getModelToken } from '@nestjs/mongoose';
import { Product } from './schemas/product.schema';
import { Order } from 'src/orders/schemas/order.schema';
import { CategoriesService } from 'src/categories/categories.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let categoriesService: CategoriesService;

  const mockProductModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  };

  const mockOrderModel = {
    findOne: jest.fn(),
  };

  const mockCategoriesService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getModelToken(Product.name), useValue: mockProductModel },
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: CategoriesService, useValue: mockCategoriesService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    categoriesService = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw NotFoundException if category does not exist', async () => {
      mockCategoriesService.findOne.mockResolvedValue(null);

      // Intentamos crear con un categoryId inválido
      await expect(
        service.create({
          name: 'Pizza',
          description: 'Deliciosa',
          price: 15,
          categoryId: 'badId',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should throw BadRequestException if product is in an order', async () => {
      // Simulamos que el producto sí existe
      mockProductModel.findById.mockResolvedValue({ _id: 'prodId' });
      // Simulamos que sí encontró una orden usándolo
      mockOrderModel.findOne.mockResolvedValue({ _id: 'order1' });

      await expect(service.remove('prodId')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if product is not found on delete', async () => {
      // Simulamos que el producto NO existe
      mockProductModel.findById.mockResolvedValue(null);

      await expect(service.remove('nonExistentId')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
