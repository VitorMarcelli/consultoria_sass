import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaClientManager } from './prisma-client-manager';

@Global()
@Module({
  providers: [PrismaService, PrismaClientManager],
  exports: [PrismaService, PrismaClientManager],
})
export class PrismaModule {}
