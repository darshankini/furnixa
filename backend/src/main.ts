import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist : true,
      forbidNonWhitelisted : true,
      stopAtFirstError : true,
      transform : true // controllers receive the DTO class with @Transform() applied (e.g. trimmed, lowercased email)
    })
  )

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
