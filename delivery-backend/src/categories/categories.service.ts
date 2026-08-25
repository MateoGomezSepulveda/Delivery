import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Category, CategoryDocument } from './schemas/category.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductsService } from 'src/products/products.service';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @Inject(forwardRef(() => ProductsService))
    private productsService: ProductsService,
  ) {}

  async create(data: Partial<Category>) {
    const newCategory = new this.categoryModel(data);
    return newCategory.save();
  }

  async findAll(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 10, search } = paginationQuery;
    const skip = (page - 1) * limit;

    const filter = search ? { name: { $regex: search, $options: 'i' } } : {};

    const categories = await this.categoryModel
      .find(filter)
      .skip(skip)
      .limit(limit);

    const total = await this.categoryModel.countDocuments(filter);
    return {
      data: categories,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }
    return category;
  }

  async update(id: string, data: Partial<Category>) {
    const updateCategory = await this.categoryModel.findByIdAndUpdate(
      id,
      data,
      { new: true },
    );
    if (!updateCategory) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }
    return updateCategory;
  }

  async remove(id: string) {
    const products = await this.productsService.findByCategory(id);
    if (products.length > 0) {
      throw new BadRequestException(
        'Cannot delete category with existing products',
      );
    }

    const deletedCategory = await this.categoryModel.findByIdAndDelete(id);
    if (!deletedCategory) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }
    return deletedCategory;
  }
}
