import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { DeliveryProfile, DeliveryProfileSchema } from './schemas/delivery-profile.schema';
import { OrdersModule } from 'src/orders/orders.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeliveryProfile.name, schema: DeliveryProfileSchema },
    ]),
    OrdersModule,
  ],
  providers: [DeliveryService],
  controllers: [DeliveryController],
})
export class DeliveryModule { }
