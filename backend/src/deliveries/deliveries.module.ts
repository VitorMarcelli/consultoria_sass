import { Module } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { DeliveriesController } from './deliveries.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';

@Module({
  imports: [PrismaModule, TaxonomyModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
})
export class DeliveriesModule {}
