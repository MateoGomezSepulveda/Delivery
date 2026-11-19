import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { CACHE_MANAGER, type Cache } from '@nestjs/cache-manager';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { Model } from 'mongoose';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductPaginationDto } from './dto/product-pagination.dto';
import { CategoriesService } from 'src/categories/categories.service';
import { Order, OrderDocument } from 'src/orders/schemas/order.schema';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @Inject(forwardRef(() => CategoriesService))
    private categoriesService: CategoriesService,
    @Optional() @Inject(CACHE_MANAGER) private cacheManager?: Cache,
  ) {}

  private async invalidateCache() {
    try {
      await this.cacheManager?.clear();
    } catch {
      // Ignorar si Redis no está disponible en entorno de test
    }
  }

  async create(dto: CreateProductDto) {
    const category = await this.categoriesService.findOne(dto.categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    const newProduct = new this.productModel(dto);
    const saved = await newProduct.save();
    await this.invalidateCache();
    return saved;
  }

  async findAll(paginationQuery: ProductPaginationDto) {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      minPrice,
      maxPrice,
      available,
      sortBy,
      sortOrder = 'desc',
    } = paginationQuery;
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

    let query = this.productModel.find(filter);
    if (sortBy && typeof (query as any).sort === 'function') {
      query = query.sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 });
    }

    const products = await query.skip(skip).limit(limit).populate('categoryId');
    const total = await this.productModel.countDocuments(filter);
    return {
      data: products,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
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
    const updated = await this.productModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    await this.invalidateCache();
    return updated;
  }

  async remove(id: string) {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    const order = await this.orderModel.findOne({
      'items.productId': id,
    });

    if (order) {
      throw new BadRequestException('Cannot delete product used in orders');
    }
    const deleted = await this.productModel.findByIdAndDelete(id);
    await this.invalidateCache();
    return deleted;
  }

  async findByCategory(categoryId: string) {
    return this.productModel.find({ categoryId });
  }
}
