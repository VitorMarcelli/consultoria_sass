import { Module } from '@nestjs/common';
import { ComplexityService } from './complexity.service';

// Não registrado em AppModule ainda: nada consome ComplexityService até o
// Bloco C (Importador) e o Bloco D (Diagnóstico), que devem importar este
// módulo quando chegar a vez deles.
@Module({
  providers: [ComplexityService],
  exports: [ComplexityService],
})
export class ComplexityModule {}
