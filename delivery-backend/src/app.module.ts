import { MongooseModule } from '@nestjs/mongoose';
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './common/logger/winston.config';
import { HealthModule } from './health/health.module';
import { AddressesModule } from './addresses/addresses.module';
import { UploadsModule } from './uploads/uploads.module';
import { PaymentsModule } from './payments/payments.module';
import { MailModule } from './mail/mail.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DeliveryModule } from './delivery/delivery.module';
import { EventsModule } from './events/events.module';
import { ReviewsModule } from './reviews/reviews.module';
import { CouponsModule } from './coupons/coupons.module';
import { QueuesModule } from './queues/queues.module';
import { AnalyticsModule } from './analytics/analytics.module';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string()
          .valid('development', 'staging', 'production', 'test')
          .default('development'),
        MONGO_URI: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        REDIS_URL: Joi.string().default('redis://localhost:6379'),
      }),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isTest = configService.get<string>('NODE_ENV') === 'test';
        const redisUrl =
          configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
        return {
          stores: isTest ? undefined : [new KeyvRedis(redisUrl)],
          ttl: 600 * 1000, // 10 minutos por defecto
        };
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
    }),
    WinstonModule.forRoot(winstonConfig),
    QueuesModule,
    UsersModule,
    AuthModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
    HealthModule,
    AddressesModule,
    UploadsModule,
    PaymentsModule,
    MailModule,
    NotificationsModule,
    DeliveryModule,
    EventsModule,
    ReviewsModule,
    CouponsModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
