import * as dotenv from 'dotenv';
// Load environment variables from .env file
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  
  // Enable CORS with permissive options to allow Vercel to connect
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: '*',
  });
  
  const port = parseInt(process.env.PORT || '10000', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`Backend server is running on port ${port} (restarted)`);
}
bootstrap();
