import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

export async function createApp() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  // Frontend and API live on different subdomains in production, so the browser needs CORS (with cookies)
  // Origin must match exactly, so drop any trailing slash from FRONTEND_URL
  app.enableCors({ origin: process.env.FRONTEND_URL?.replace(/\/+$/, ''), credentials: true });
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