import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaClientManager implements OnModuleDestroy {
  // Cache of Prisma clients per tenant schema
  private clients: { [tenantId: string]: PrismaClient } = {};

  getClient(tenantId: string): PrismaClient {
    if (!this.clients[tenantId]) {
      const databaseUrl = process.env.DATABASE_URL;

      if (!databaseUrl) {
        throw new Error('DATABASE_URL is not defined');
      }

      // Parse the URL to dynamically inject the specific tenant's schema
      const urlWithSchema = new URL(databaseUrl);
      urlWithSchema.searchParams.set('schema', tenantId);

      this.clients[tenantId] = new PrismaClient({
        datasources: {
          db: {
            url: urlWithSchema.toString(),
          },
        },
      });
    }

    return this.clients[tenantId];
  }

  async onModuleDestroy() {
    // Gracefully disconnect all cached clients when the app shuts down
    await Promise.all(
      Object.values(this.clients).map((client) => client.$disconnect()),
    );
  }
}
