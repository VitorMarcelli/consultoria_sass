import * as dotenv from 'dotenv';
// Load environment variables from .env file
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  
  // Enable CORS with permissive options to allow Vercel to connect
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, Bypass-Tunnel-Reminder, ngrok-skip-browser-warning',
  });
  
  const port = process.env.PORT || 3333;
  await app.listen(port);
  console.log(`Backend server is running on port ${port} (restarted)`);
}
bootstrap();
