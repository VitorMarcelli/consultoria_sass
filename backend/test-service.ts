import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ClientsService } from './src/clients/clients.service';
import { PrismaService } from './src/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const clientsService = app.get(ClientsService);
  const prisma = app.get(PrismaService);

  try {
    const user = await prisma.user.findFirst();
    if (user) {
      console.log(`Testing with user ${user.id} (tenant: ${user.tenantId})`);
      const clients = await clientsService.findAll(user.id);
      console.log("Clients:", clients);
    } else {
      console.log("No users found to test with");
    }
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await app.close();
  }
}

bootstrap();
