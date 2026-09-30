import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

export async function createApp() {
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

  return app;
}