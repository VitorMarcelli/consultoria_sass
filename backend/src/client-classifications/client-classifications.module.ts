import { Module } from '@nestjs/common';
import { ClientClassificationsController } from './client-classifications.controller';
import { ClientClassificationsService } from './client-classifications.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ComplexityModule } from '../complexity/complexity.module';

@Module({
  imports: [PrismaModule, ComplexityModule],
  controllers: [ClientClassificationsController],
  providers: [ClientClassificationsService],
})
export class ClientClassificationsModule {}
