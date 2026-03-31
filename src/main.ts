import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.useGlobalFilters(new HttpExceptionFilter());

  app.use(helmet());
  app.enableCors({
    origin:'*',
    //methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    //credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
