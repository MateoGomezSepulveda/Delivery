import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Crear una nueva reseña (solo órdenes DELIVERED)' })
  @Post()
  create(@Request() req, @Body() createReviewDto: CreateReviewDto) {
    // req.user.userId viene del payload de nuestro JwtStrategy
    return this.reviewsService.create(req.user.userId, createReviewDto);
  }

  @Public()
  @ApiOperation({ summary: 'Obtener reseñas de un producto (Público)' })
  @Get('product/:productId')
  findByProduct(@Param('productId', ParseMongoIdPipe) productId: string) {
    return this.reviewsService.findByProduct(productId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Eliminar una reseña (Dueño o Admin)' })
  @Delete(':id')
  remove(@Request() req, @Param('id', ParseMongoIdPipe) id: string) {
    return this.reviewsService.remove(id, req.user.userId, req.user.role);
  }
}
