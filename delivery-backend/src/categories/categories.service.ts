import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { Category, CategoryDocument } from './schemas/category.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductsService } from 'src/products/products.service';

@Injectable()
export class CategoriesService {
    constructor(@InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @Inject(forwardRef(() => ProductsService))
    private productsService: ProductsService,
) {}

    async create(data: Partial<Category>){
        const newCategory = new this.categoryModel(data);
        return newCategory.save();
    }

    async findAll(){
        return this.categoryModel.find();
    }

    async findOne(id: string){
        return this.categoryModel.findById(id);
    }

    async update(id: string, data: Partial<Category>){
        return this.categoryModel.findByIdAndUpdate(id, data, {new: true});
    }

    async remove(id: string){
        const products = await this.productsService.findByCategory(id);
        if (products.length > 0){
            throw new BadRequestException('Cannot delete category with existing products');
        }
        return this.categoryModel.findByIdAndDelete(id);
    }
}