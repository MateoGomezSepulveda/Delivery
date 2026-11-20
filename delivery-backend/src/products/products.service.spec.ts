import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { getModelToken } from '@nestjs/mongoose';
import { Product } from './schemas/product.schema';
import { Order } from 'src/orders/schemas/order.schema';
import { CategoriesService } from 'src/categories/categories.service';
import { UploadsService } from 'src/uploads/uploads.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let categoriesService: CategoriesService;

  const mockSave = jest.fn();

  const mockProductModel = jest.fn().mockImplementation(() => ({
    save: mockSave,
  })) as any;

  mockProductModel.findById = jest.fn();
  mockProductModel.findByIdAndUpdate = jest.fn();
  mockProductModel.findByIdAndDelete = jest.fn();
  mockProductModel.findOneAndUpdate = jest.fn();
  mockProductModel.updateOne = jest.fn();
  mockProductModel.updateMany = jest.fn();
  mockProductModel.find = jest.fn();
  mockProductModel.countDocuments = jest.fn();

  const mockOrderModel = {
    findOne: jest.fn(),
  };

  const mockCategoriesService = {
    findOne: jest.fn(),
  };

  const mockUploadsService = {
    deleteFile: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getModelToken(Product.name), useValue: mockProductModel },
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: CategoriesService, useValue: mockCategoriesService },
        { provide: UploadsService, useValue: mockUploadsService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    categoriesService = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
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

    it('debe crear y retornar el producto si la categoria existe', async () => {
      const categoriaFalsa = { _id: 'cat-1', name: 'Pizzas' };
      const productoEsperado = { _id: 'prod-1', name: 'Margarita' };

      mockCategoriesService.findOne.mockResolvedValue(categoriaFalsa);
      mockSave.mockResolvedValue(productoEsperado);

      const result = await service.create({
        name: 'Margarita',
        categoryId: 'cat-1',
      } as any);

      expect(mockCategoriesService.findOne).toHaveBeenCalledWith('cat-1');
      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(productoEsperado);
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

  describe('findOne', () => {
    it('debe retornar el producto si existe', async () => {
      const productoFalso = { _id: '123', name: 'Pizza' };
      mockProductModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(productoFalso),
      });

      const resultado = await service.findOne('123');

      expect(mockProductModel.findById).toHaveBeenCalledWith('123');
      expect(resultado).toEqual(productoFalso);
    });

    it('debe lanzar NotFoundException si elproducto no existe', async () => {
      mockProductModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne('123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('debe actualizar y retornar el producto modificado', async () => {
      const productoActualizado = { _id: '123', name: 'Pizza Actualizada' };
      mockProductModel.findById.mockResolvedValue({ _id: '123' });
      mockProductModel.findByIdAndUpdate.mockResolvedValue(productoActualizado);

      const resultado = await service.update('123', {
        name: 'Pizza Actualizada',
      } as any);

      expect(mockProductModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '123',
        { name: 'Pizza Actualizada' } as any,
        { new: true },
      );
      expect(resultado).toEqual(productoActualizado);
    });

    it('debe lanzar NotFoundException si el producto no existe al actualizar', async () => {
      mockProductModel.findById.mockResolvedValue(null);

      await expect(
        service.update('123', { name: 'Pizza Actualizada' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('marca available=false automáticamente al actualizar stock a 0', async () => {
      mockProductModel.findById.mockResolvedValue({
        _id: '123',
        stock: 5,
        available: true,
      });
      mockProductModel.findByIdAndUpdate.mockResolvedValue({
        _id: '123',
        stock: 0,
        available: false,
      });

      const res = await service.update('123', { stock: 0 });

      expect(mockProductModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({ stock: 0, available: false }),
        { new: true },
      );
      expect(res?.available).toBe(false);
    });

    it('rechaza activar available=true cuando el stock es 0', async () => {
      mockProductModel.findById.mockResolvedValue({
        _id: '123',
        stock: 0,
        available: false,
      });

      await expect(service.update('123', { available: true })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('elimina en S3 la imagen anterior al reemplazarla en update()', async () => {
      const oldImage =
        'https://bucket.s3.us-east-1.amazonaws.com/products/old.jpg';
      const newImage =
        'https://bucket.s3.us-east-1.amazonaws.com/products/new.jpg';

      mockProductModel.findById.mockResolvedValue({
        _id: '123',
        image: oldImage,
        stock: 5,
        available: true,
      });
      mockProductModel.findByIdAndUpdate.mockResolvedValue({
        _id: '123',
        image: newImage,
      });

      await service.update('123', { image: newImage });

      expect(mockUploadsService.deleteFile).toHaveBeenCalledWith(oldImage);
    });
  });

  describe('reserveStockForOrder & restoreStockForOrder', () => {
    it('descuenta stock atómicamente y marca available=false cuando llega a 0', async () => {
      mockProductModel.findOneAndUpdate.mockResolvedValueOnce({
        _id: 'prod-1',
        costPrice: 12000,
        stock: 0,
        available: true,
      });
      mockProductModel.updateOne.mockResolvedValueOnce({});

      const snapshots = await service.reserveStockForOrder([
        { productId: 'prod-1', quantity: 2, name: 'Whisky' },
      ]);

      expect(mockProductModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'prod-1', available: true, stock: { $gte: 2 } },
        { $inc: { stock: -2 } },
        { new: true },
      );
      expect(mockProductModel.updateOne).toHaveBeenCalledWith(
        { _id: 'prod-1', stock: { $lte: 0 } },
        { $set: { available: false, stock: 0 } },
      );
      expect(snapshots.get('prod-1')).toEqual({
        productId: 'prod-1',
        costPrice: 12000,
        remainingStock: 0,
      });
    });

    it('hace rollback si un segundo producto no tiene stock suficiente', async () => {
      mockProductModel.findOneAndUpdate
        .mockResolvedValueOnce({
          _id: 'prod-1',
          costPrice: 10000,
          stock: 3,
          available: true,
        })
        .mockResolvedValueOnce(null);
      mockProductModel.findById.mockResolvedValueOnce({
        _id: 'prod-2',
        name: 'Vino Reserva',
        stock: 1,
        available: true,
      });
      mockProductModel.findByIdAndUpdate.mockResolvedValueOnce({
        _id: 'prod-1',
        stock: 5,
        available: true,
      });

      await expect(
        service.reserveStockForOrder([
          { productId: 'prod-1', quantity: 2, name: 'Queso' },
          { productId: 'prod-2', quantity: 4, name: 'Vino Reserva' },
        ]),
      ).rejects.toThrow(BadRequestException);

      expect(mockProductModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'prod-1',
        { $inc: { stock: 2 } },
        { new: true },
      );
    });
  });
});
