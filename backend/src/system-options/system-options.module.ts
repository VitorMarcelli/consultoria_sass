import { Module } from '@nestjs/common';
import { SystemOptionsService } from './system-options.service';
import { SystemOptionsController } from './system-options.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SystemOptionsController],
  providers: [SystemOptionsService],
})
export class SystemOptionsModule {}
