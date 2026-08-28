import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { getModelToken } from '@nestjs/mongoose';
import { Category } from './schemas/category.schema';
import { ProductsService } from 'src/products/products.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let productsService: ProductsService;

  const mockCategoryModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockProductsService = {
    findByCategory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getModelToken(Category.name),
          useValue: mockCategoryModel,
        },
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    productsService = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('remove', () => {
    it('should throw BadRequestException when trying to delete category with products', async () => {
      // Simulamos que el servicio de productos retorna un array con elementos
      mockProductsService.findByCategory.mockResolvedValue(['producto1']);

      // Esperamos que service.remove rechace con un BadRequestException
      await expect(service.remove('someId')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if category is not found on delete', async () => {
      // Simulamos que la categoría NO tiene productos
      mockProductsService.findByCategory.mockResolvedValue([]);

      // Simulamos que MongoDB retorna null (no se encontró al intentar borrar)
      mockCategoryModel.findByIdAndDelete.mockResolvedValue(null);

      // Esperamos el NotFoundException que programamos en el servicio
      await expect(service.remove('nonExistentId')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    // Test 1: El camino feliz
    it('debe retornar la categoría si existe', async () => {
      // 1. PREPARACIÓN (Arrange): Le decimos al mock qué debe responder
      const categoriaFalsa = { _id: '123', name: 'Pizzas' };
      mockCategoryModel.findById.mockResolvedValue(categoriaFalsa);

      // 2. ACCIÓN (Act): Llamamos al método real de nuestro servicio
      const resultado = await service.findOne('123');

      // 3. VERIFICACIÓN (Assert): Comprobamos que el resultado es el esperado
      expect(resultado).toEqual(categoriaFalsa);
    });

    // Test 2: El camino triste
    it('debe lanzar NotFoundException si la categoría no existe', async () => {
      // 1. PREPARACIÓN: Le decimos al mock que simule que no encontró nada (null)
      mockCategoryModel.findById.mockResolvedValue(null);

      // 2 y 3. ACCIÓN Y VERIFICACIÓN: Comprobamos que lance el error correcto
      await expect(service.findOne('id-falso')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    // Test 1: El camino feliz
    it('debe actualizar y retornar la categoría modificada', async () => {
      const categoriaFalsa = { _id: '123', name: 'Pizzas Italianas' };
      mockCategoryModel.findByIdAndUpdate.mockResolvedValue(categoriaFalsa);

      const resultado = await service.update('123', {
        name: 'Pizzas Italianas',
      });

      expect(resultado).toEqual(categoriaFalsa);
    });

    // Test 2: El camino triste
    it('debe lanzar NotFoundException si la categoría no existe al actualizar', async () => {
      mockCategoryModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.update('id-falso', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('debe retornar lista paginada de categorias', async () => {
      const mockCategorias = [{ name: 'Pizza' }, { name: 'Empanadas' }];

      mockCategoryModel.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockCategorias),
        }),
      });

      mockCategoryModel.countDocuments.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toEqual(mockCategorias);
      expect(result.meta.total).toBe(2);
    });
  });
});
