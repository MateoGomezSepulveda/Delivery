import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { getModelToken } from '@nestjs/mongoose';
import { Cart } from './schemas/cart.schema';
import { ProductsService } from 'src/products/products.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockFindOnePopulate = (returnValue: any) => ({
    populate: jest.fn().mockResolvedValue(returnValue),
});

describe('CartService', () => {
    let service: CartService;

    const mockCartModel = {
        findOne: jest.fn(),
    };

    const mockProductsService = {
        findOne: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CartService,
                { provide: getModelToken(Cart.name), useValue: mockCartModel },
                { provide: ProductsService, useValue: mockProductsService },
            ],
        }).compile();

        service = module.get<CartService>(CartService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('addProduct', () => {
        it('should throw BadRequestException if quantity <= 0', async () => {
            await expect(
                service.addProduct('user1', 'prod1', 0),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw NotFoundException if product does not exist', async () => {
            mockProductsService.findOne.mockResolvedValue(null);

            await expect(
                service.addProduct('user1', 'prod1', 2),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException if product is not available', async () => {
            mockProductsService.findOne.mockResolvedValue({
                _id: 'prod1',
                price: 10,
                available: false,
            });

            await expect(
                service.addProduct('user1', 'prod1', 2),
            ).rejects.toThrow(NotFoundException);
        });

        it('should add a new item if product is not already in cart', async () => {
            const product = { _id: 'prod1', price: 10, available: true };
            const cartWithSave = {
                userId: 'user1',
                items: [],
                total: 0,
                status: 'ACTIVE',
                save: jest.fn().mockResolvedValue(true),
            };

            mockProductsService.findOne.mockResolvedValue(product);
            mockCartModel.findOne.mockReturnValue(mockFindOnePopulate(cartWithSave));

            await service.addProduct('user1', 'prod1', 2);

            expect(cartWithSave.items).toHaveLength(1);
            expect(cartWithSave.total).toBe(20);
            expect(cartWithSave.save).toHaveBeenCalled();
        });

        it('should increment quantity if product is already in cart', async () => {
            const product = { _id: 'prod1', price: 10, available: true };
            const cartWithSave = {
                userId: 'user1',
                items: [{ productId: { toString: () => 'prod1' }, quantity: 1, price: 10 }],
                total: 10,
                status: 'ACTIVE',
                save: jest.fn().mockResolvedValue(true),
            };

            mockProductsService.findOne.mockResolvedValue(product);
            mockCartModel.findOne.mockReturnValue(mockFindOnePopulate(cartWithSave));

            await service.addProduct('user1', 'prod1', 3);

            expect(cartWithSave.items[0].quantity).toBe(4);
            expect(cartWithSave.save).toHaveBeenCalled();
        });
    });

    describe('removeProduct', () => {
        it('should remove the product from cart items and recalculate total', async () => {
            const cartWithSave = {
                userId: 'user1',
                items: [{ productId: { toString: () => 'prod1' }, quantity: 2, price: 10 }],
                total: 20,
                status: 'ACTIVE',
                save: jest.fn().mockResolvedValue(true),
            };

            mockCartModel.findOne.mockReturnValue(mockFindOnePopulate(cartWithSave));

            await service.removeProduct('user1', 'prod1');

            expect(cartWithSave.items).toHaveLength(0);
            expect(cartWithSave.total).toBe(0);
            expect(cartWithSave.save).toHaveBeenCalled();
        });
    });

    describe('clearCart', () => {
        it('should empty all items and reset total to 0', async () => {
            const cartWithSave = {
                userId: 'user1',
                items: [
                    { productId: 'prod1', quantity: 2, price: 10 },
                    { productId: 'prod2', quantity: 1, price: 5 },
                ],
                total: 25,
                status: 'ACTIVE',
                save: jest.fn().mockResolvedValue(true),
            };

            mockCartModel.findOne.mockReturnValue(mockFindOnePopulate(cartWithSave));

            await service.clearCart('user1');

            expect(cartWithSave.items).toHaveLength(0);
            expect(cartWithSave.total).toBe(0);
            expect(cartWithSave.save).toHaveBeenCalled();
        });
    });
});
