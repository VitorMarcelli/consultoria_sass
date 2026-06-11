import { Module } from '@nestjs/common';
import { ManagementCyclesService } from './management-cycles.service';
import { ManagementCyclesController } from './management-cycles.controller';

@Module({
  controllers: [ManagementCyclesController],
  providers: [ManagementCyclesService],
})
export class ManagementCyclesModule {}
