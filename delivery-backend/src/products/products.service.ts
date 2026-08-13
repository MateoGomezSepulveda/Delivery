import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { Model } from 'mongoose';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductPaginationDto } from './dto/product-pagination.dto';
import { CategoriesService } from 'src/categories/categories.service';
import { Order, OrderDocument } from 'src/orders/schemas/order.schema';

@Injectable()
export class ProductsService {
  constructor(@InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @Inject(forwardRef(() => CategoriesService))
    private categoriesService: CategoriesService,
  ) { }

  async create(dto: CreateProductDto) {
    const category = await this.categoriesService.findOne(dto.categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    const newProduct = new this.productModel(dto);
    return newProduct.save();
  }

  async findAll(paginationQuery: ProductPaginationDto) {
    const { page = 1, limit = 10, search, categoryId, minPrice, maxPrice, available } = paginationQuery;
    const skip = (page - 1) * limit;
    const filter: any = {};
    // Búsqueda usando el índice de texto de MongoDB
    if (search) {
      filter.$text = { $search: search };
    }

    if (categoryId) filter.categoryId = categoryId;
    if (available !== undefined) filter.available = available;

    // Filtro de rango de precios
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = minPrice;
      if (maxPrice !== undefined) filter.price.$lte = maxPrice;
    }
    const products = await this.productModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .populate('categoryId');
    const total = await this.productModel.countDocuments(filter);
    return {
      data: products,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit)
      }
    };
  }

  async findOne(id: string) {
    const product = await this.productModel.findById(id).populate('categoryId');
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return product;
  }

  async update(id: string, updateData: Partial<Product>) {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return this.productModel.findByIdAndUpdate(id, updateData, { new: true });
  }

  async remove(id: string) {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    const order = await this.orderModel.findOne({
      'items.productId': id
    });

    if (order) {
      throw new BadRequestException(
        'Cannot delete product used in orders',
      )
    }
    return this.productModel.findByIdAndDelete(id);
  }

  async findByCategory(categoryId: string) {
    return this.productModel.find({ categoryId });
  }

}
