import { Module } from '@nestjs/common';
import { ActivityCatalogService } from './activity-catalog.service';
import { ActivityCatalogController } from './activity-catalog.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';

@Module({
  imports: [PrismaModule, TaxonomyModule],
  controllers: [ActivityCatalogController],
  providers: [ActivityCatalogService],
  exports: [ActivityCatalogService],
})
export class ActivityCatalogModule {}
