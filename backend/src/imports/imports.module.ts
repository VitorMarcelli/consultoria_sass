import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { ComplexityModule } from '../complexity/complexity.module';

@Module({
  imports: [ComplexityModule],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
