import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';

export class TestAppFactory {
  static async create(): Promise<INestApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // El TransformInterceptor está en main.ts, debemos replicarlo aquí
    app.useGlobalInterceptors(new TransformInterceptor());

    app.setGlobalPrefix('api/v1');
    await app.init();
    return app;
  }
}
