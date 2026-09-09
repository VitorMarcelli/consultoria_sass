import { Module } from '@nestjs/common';
import { ComplexityService } from './complexity.service';
import { CcCoService } from './cc-co.service';
import { CcCoController } from './cc-co.controller';
import { PrismaModule } from '../prisma/prisma.module';

// ComplexityService é o motor antigo (escala 1..3) e segue exportado para o
// Importador e o Diagnóstico, que ainda o consomem.
//
// CcCoService é o motor novo (dois índices, escala 1..5) da ORDEM-02. Os dois
// convivem de propósito até as telas terminarem de migrar.
@Module({
  imports: [PrismaModule],
  controllers: [CcCoController],
  providers: [ComplexityService, CcCoService],
  exports: [ComplexityService, CcCoService],
})
export class ComplexityModule {}
