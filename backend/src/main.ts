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
  
  // Allow Node.js to choose the best binding (dual-stack IPv4/IPv6)
  // Hardcoding 0.0.0.0 can break Render's IPv6 internal routing mesh.
  await app.listen(port);

  const server = app.getHttpServer();
  const address = server.address();
  console.log(`[NETWORK] Backend server is running on port ${port} (restarted)`);
  console.log(`[NETWORK] Server physical binding address: ${JSON.stringify(address)}`);

  // INTERNAL DIAGNOSTIC LOOP
  setInterval(() => {
    require('http').get(`http://127.0.0.1:${port}/`, (res: any) => {
      console.log(`[INTERNAL PING] Health check to itself: HTTP ${res.statusCode}`);
    }).on('error', (err: any) => {
      console.error(`[INTERNAL PING] Failed to reach itself:`, err.message);
    });
  }, 10000);
}
bootstrap();
