import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import { ProductsService } from 'src/products/products.service';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private productsService: ProductsService,
  ) { }

  async getActiveCart(userId: string) {
    let cart = await this.cartModel
      .findOne({ userId, status: 'ACTIVE' })
      .populate('items.productId');
    if (!cart) {
      cart = new this.cartModel({ userId });
      await cart.save();
    }

    return cart;
  }

  async addProduct(userId: string, productId: string, quantity: number) {

    if (quantity <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a cero');
    }

    const product = await this.productsService.findOne(productId);
    if (!product) throw new NotFoundException('Product not found');

    if (!product.available) throw new NotFoundException('Product not available');

    const cart = await this.getActiveCart(userId);

    const itemIndex = cart.items.findIndex((item: any) => {
      const id = item.productId._id || item.productId;
      return id.toString() === productId;
    });

    if (itemIndex >= 0) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({
        productId,
        quantity,
        price: product.price,
      });
    }

    cart.total = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    return cart.save();
  }

  async removeProduct(userId: string, productId: string) {
    const cart = await this.getActiveCart(userId);

    cart.items = cart.items.filter((item: any) => {
      const id = item.productId._id || item.productId;
      return id.toString() !== productId;
    });

    cart.total = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    return cart.save();
  }

  async clearCart(userId: string) {
    const cart = await this.getActiveCart(userId);
    cart.items = [];
    cart.total = 0; // Usamos 'total' en lugar de 'totalPrice'

    return cart.save();
  }

  async getCart(userId: string) {
    return this.getActiveCart(userId);
  }
}
