import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AddToCartDto } from './dto/add-to-cart.dto';

@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
    constructor(private readonly cartService: CartService){}

    @Get()
    getCart(@Req() req){
        return this.cartService.getCart(req.user.userId);
    }

    @Post('add')
    addProduct(
        @Req() req,
        @Body() body: AddToCartDto,
    ){
        return this.cartService.addProduct(
            req.user.userId,
            body.productId,
            body.quantity,
        );
    }

    @Delete('remove')
    removeProduct(
        @Req() req,
        @Body() body: { productId: string},

    ){
        return this.cartService.removeProduct(
            req.user.userId,
            body.productId,
        );
    }
}
