import { Module } from '@nestjs/common';
import { ClientClassificationsController } from './client-classifications.controller';
import { ClientClassificationsService } from './client-classifications.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClientClassificationsController],
  providers: [ClientClassificationsService],
})
export class ClientClassificationsModule {}
