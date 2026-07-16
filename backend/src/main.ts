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
  
  // Bind explicitly to 0.0.0.0 (IPv4) but also allow IPv6 if supported by omitting host, 
  // or just use 0.0.0.0 which is the standard for Render.
  await app.listen(port, '0.0.0.0');

  const server = app.getHttpServer();
  const address = server.address();
  console.log(`[NETWORK] Backend server is running on port ${port} (restarted)`);
  console.log(`[NETWORK] Server physical binding address: ${JSON.stringify(address)}`);

  // INTERNAL DIAGNOSTIC LOOP
  setInterval(() => {
    require('http').get(`http://127.0.0.1:${port}/`, (res) => {
      console.log(`[INTERNAL PING] Health check to itself: HTTP ${res.statusCode}`);
    }).on('error', (err) => {
      console.error(`[INTERNAL PING] Failed to reach itself:`, err.message);
    });
  }, 10000);
}
bootstrap();
