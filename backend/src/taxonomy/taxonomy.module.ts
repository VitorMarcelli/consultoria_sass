import { Module } from '@nestjs/common';
import { TaxonomyService } from './taxonomy.service';
import { TaxonomyController } from './taxonomy.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TaxonomyController],
  providers: [TaxonomyService],
  exports: [TaxonomyService],
})
export class TaxonomyModule {}
