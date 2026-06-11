import * as dotenv from 'dotenv';
// Load environment variables from .env file
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS so the Next.js frontend (on localhost:3000) can make API calls
  app.enableCors();
  
  const port = process.env.PORT || 3333;
  await app.listen(port);
  console.log(`Backend server is running on port ${port} (restarted)`);
}
bootstrap();
