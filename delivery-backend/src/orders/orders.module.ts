import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schema';
import { CartModule } from 'src/cart/cart.module';
import { PaymentsModule } from 'src/payments/payments.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    CartModule,
    PaymentsModule,
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [MongooseModule],
})
export class OrdersModule {}
