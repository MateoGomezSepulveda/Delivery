import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schema';
import { CartModule } from 'src/cart/cart.module';
import { PaymentsModule } from 'src/payments/payments.module';
import { UsersModule } from 'src/users/users.module';
import { MailModule } from 'src/mail/mail.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    CartModule,
    UsersModule,
    forwardRef(() => PaymentsModule),
    MailModule,
    NotificationsModule,
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [MongooseModule],
})
export class OrdersModule { }
