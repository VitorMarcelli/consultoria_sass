import { Module } from '@nestjs/common';
import { ClientCatalogService } from './client-catalog.service';
import { ClientCatalogController } from './client-catalog.controller';

@Module({
  controllers: [ClientCatalogController],
  providers: [ClientCatalogService],
  exports: [ClientCatalogService],
})
export class ClientCatalogModule {}
