import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
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

export interface ReservedProductSnapshot {
  productId: string;
  costPrice: number;
  remainingStock: number;
}

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @Inject(forwardRef(() => CategoriesService))
    private categoriesService: CategoriesService,
    @Optional() @Inject(CACHE_MANAGER) private cacheManager?: Cache,
  ) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    try {
      await Promise.all([
        this.productModel.updateMany(
          { stock: { $exists: false } },
          { $set: { stock: 10, lowStockThreshold: 5 } },
        ),
        this.productModel.updateMany(
          { costPrice: { $exists: false } },
          { $set: { costPrice: 0 } },
        ),
      ]);
    } catch {
      // No bloquear el arranque si la colección aún no existe o está en test
    }
  }

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

    const stock =
      dto.stock !== undefined ? Math.max(0, Math.floor(Number(dto.stock))) : 10;
    const costPrice =
      dto.costPrice !== undefined ? Math.max(0, Number(dto.costPrice)) : 0;
    const lowStockThreshold =
      dto.lowStockThreshold !== undefined
        ? Math.max(1, Math.floor(Number(dto.lowStockThreshold)))
        : 5;
    const available = stock <= 0 ? false : (dto.available ?? true);

    const newProduct = new this.productModel({
      ...dto,
      stock,
      costPrice,
      lowStockThreshold,
      available,
    });
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

    const payload: Partial<Product> = { ...updateData };

    if (payload.costPrice !== undefined) {
      payload.costPrice = Math.max(0, Number(payload.costPrice));
    }

    if (payload.lowStockThreshold !== undefined) {
      payload.lowStockThreshold = Math.max(
        1,
        Math.floor(Number(payload.lowStockThreshold)),
      );
    }

    const currentStock =
      typeof product.stock === 'number' ? product.stock : undefined;
    let effectiveStock = currentStock;

    if (payload.stock !== undefined) {
      const normalizedStock = Math.max(0, Math.floor(Number(payload.stock)));
      payload.stock = normalizedStock;
      effectiveStock = normalizedStock;

      if (normalizedStock <= 0) {
        payload.available = false;
      } else if (
        currentStock !== undefined &&
        currentStock <= 0 &&
        updateData.available === undefined
      ) {
        // Al reponer inventario de un producto agotado, vuelve a estar disponible
        payload.available = true;
      }
    }

    if (
      payload.available === true &&
      effectiveStock !== undefined &&
      effectiveStock <= 0
    ) {
      throw new BadRequestException(
        'No puedes activar un producto con stock en 0. Agrega unidades al inventario primero.',
      );
    }

    const query = this.productModel.findByIdAndUpdate(id, payload, {
      new: true,
    });
    const updated =
      query && typeof (query as any).populate === 'function'
        ? await (query as any).populate('categoryId')
        : await query;

    await this.invalidateCache();
    return updated;
  }

  /**
   * Descuenta stock atómicamente para todos los ítems de un pedido.
   * Si algún producto no tiene stock suficiente, hace rollback automático de los anteriores.
   * Cuando el stock llega a 0, marca el producto como available = false automáticamente.
   */
  async reserveStockForOrder(
    items: Array<{ productId: string; quantity: number; name?: string }>,
  ): Promise<Map<string, ReservedProductSnapshot>> {
    // Agrupar cantidades por productId por si un producto apareciera repetido
    const aggregated = new Map<string, { quantity: number; name?: string }>();
    for (const item of items) {
      const pid = String(item.productId);
      const prev = aggregated.get(pid);
      aggregated.set(pid, {
        quantity: (prev?.quantity ?? 0) + item.quantity,
        name: item.name ?? prev?.name,
      });
    }

    const reserved: Array<{ productId: string; quantity: number }> = [];
    const snapshots = new Map<string, ReservedProductSnapshot>();

    try {
      for (const [productId, { quantity, name }] of aggregated.entries()) {
        const updated = await this.productModel.findOneAndUpdate(
          {
            _id: productId,
            available: true,
            stock: { $gte: quantity },
          },
          { $inc: { stock: -quantity } },
          { new: true },
        );

        if (!updated) {
          const existing = await this.productModel.findById(productId);
          if (!existing) {
            throw new BadRequestException(
              `El producto "${name || productId}" ya no está disponible en el catálogo.`,
            );
          }
          const availableStock = Math.max(0, existing.stock ?? 0);
          if (!existing.available || availableStock <= 0) {
            throw new BadRequestException(
              `El producto "${existing.name || name}" se encuentra agotado.`,
            );
          }
          throw new BadRequestException(
            `Stock insuficiente para "${existing.name || name}". Solo quedan ${availableStock} ${availableStock === 1 ? 'unidad' : 'unidades'} disponibles.`,
          );
        }

        reserved.push({ productId, quantity });

        if (updated.stock <= 0) {
          await this.productModel.updateOne(
            { _id: productId, stock: { $lte: 0 } },
            { $set: { available: false, stock: 0 } },
          );
        }

        snapshots.set(productId, {
          productId,
          costPrice: Math.max(0, Number(updated.costPrice ?? 0)),
          remainingStock: Math.max(0, updated.stock),
        });
      }

      await this.invalidateCache();
      return snapshots;
    } catch (error) {
      if (reserved.length > 0) {
        await this.restoreStockForOrder(reserved).catch(() => undefined);
      }
      throw error;
    }
  }

  /**
   * Restaura stock al cancelar un pedido o hacer rollback de una orden fallida.
   * Si el producto estaba agotado (stock <= 0), lo reactiva automáticamente.
   */
  async restoreStockForOrder(
    items: Array<{ productId: string | any; quantity: number }>,
  ): Promise<void> {
    if (!items?.length) return;

    for (const item of items) {
      const productId = (item.productId?._id ?? item.productId)?.toString();
      if (!productId || !item.quantity || item.quantity <= 0) continue;

      const updated = await this.productModel.findByIdAndUpdate(
        productId,
        { $inc: { stock: item.quantity } },
        { new: true },
      );

      if (updated && !updated.available && updated.stock > 0) {
        await this.productModel.updateOne(
          { _id: productId },
          { $set: { available: true } },
        );
      }
    }

    await this.invalidateCache();
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
