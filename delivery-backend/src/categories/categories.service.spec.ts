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
            await expect(service.remove('someId')).rejects.toThrow(BadRequestException);
        });

        it('should throw NotFoundException if category is not found on delete', async () => {
            // Simulamos que la categoría NO tiene productos
            mockProductsService.findByCategory.mockResolvedValue([]);

            // Simulamos que MongoDB retorna null (no se encontró al intentar borrar)
            mockCategoryModel.findByIdAndDelete.mockResolvedValue(null);

            // Esperamos el NotFoundException que programamos en el servicio
            await expect(service.remove('nonExistentId')).rejects.toThrow(NotFoundException);
        });
    });
});
