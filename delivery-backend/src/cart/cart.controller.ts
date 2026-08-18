import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { RemoveFromCartDto } from './dto/remove-from-cart.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
    constructor(private readonly cartService: CartService) { }
    @ApiOperation({ summary: 'Obtener el carrito activo del usuario' })
    @Get()
    getCart(@Req() req) {
        return this.cartService.getCart(req.user.userId);
    }

    @ApiOperation({ summary: 'Agregar un producto al carrito' })
    @Post('add')
    addProduct(
        @Req() req,
        @Body() body: AddToCartDto,
    ) {
        return this.cartService.addProduct(
            req.user.userId,
            body.productId,
            body.quantity,
        );
    }

    @ApiOperation({ summary: 'Eliminar un producto del carrito' })
    @Delete('remove')
    removeProduct(
        @Req() req,
        @Body() body: RemoveFromCartDto,

    ) {
        return this.cartService.removeProduct(
            req.user.userId,
            body.productId,
        );
    }

    @ApiOperation({ summary: 'Eliminar todos los productos del carrito' })
    @Delete('clear')
    clearCart(@Req() req) {
        return this.cartService.clearCart(req.user.userId);
    }
}
