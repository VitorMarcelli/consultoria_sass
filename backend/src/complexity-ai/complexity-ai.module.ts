import { Module } from '@nestjs/common';
import { ComplexityAiController } from './complexity-ai.controller';
import { ComplexityAiService } from './complexity-ai.service';
import { ComplexityAiLlmClient } from './llm-client';
import { ComplexityModule } from '../complexity/complexity.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ComplexityModule],
  controllers: [ComplexityAiController],
  providers: [ComplexityAiService, ComplexityAiLlmClient],
  exports: [ComplexityAiService],
})
export class ComplexityAiModule {}
