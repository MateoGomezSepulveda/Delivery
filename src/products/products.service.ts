import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from './schemas/producct.schema';
import { Model } from 'mongoose';
import { CreateProductDto } from './dto/create-product.dto';
import { NotFoundError } from 'rxjs';
import { CategoriesService } from 'src/categories/categories.service';
import { Order, OrderDocument } from 'src/orders/schemas/order.schema';

@Injectable()
export class ProductsService {
    constructor(@InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @Inject(forwardRef(() => CategoriesService))
    private categoriesService: CategoriesService,
    ) {}

  async create(dto: CreateProductDto) {
    const category = await this.categoriesService.findOne(dto.categoryId);
    if (!category) {
      throw new NotFoundError('Category not found');
    }
    const newProduct = new this.productModel(dto);
    return newProduct.save();
  }

  async findAll() {
    return this.productModel
    .find()
    .populate('categoryId');
  }

  async findOne(id: string) {
    return this.productModel
    .findById(id)
    .populate('categoryId');
  }

  async update(id: string, updateData: Partial<Product>) {
    return this.productModel.findByIdAndUpdate(id, updateData, { new: true });
  }

  async remove(id: string) {
    const order = await this.orderModel.findOne({ 
      'items.productId': id 
    });

    if (order){
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
