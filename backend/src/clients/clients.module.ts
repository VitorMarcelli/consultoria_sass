import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { ClientClassificationsService } from './client-classifications.service';
import { ClientClassificationsController } from './client-classifications.controller';

@Module({
  controllers: [ClientsController, ClientClassificationsController],
  providers: [ClientsService, ClientClassificationsService],
  exports: [ClientsService, ClientClassificationsService],
})
export class ClientsModule {}
