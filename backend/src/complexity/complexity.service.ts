import { Injectable } from '@nestjs/common';
import {
  evaluateComplexity,
  calculateVolumeScore,
  calculateCoefficients,
  EvaluateComplexityInput,
  EvaluateComplexityResult,
  VolumeInput,
  VolumeResult,
  AssessmentRecord,
  CoefficientResult,
} from './complexity.rules';

// Wrapper injetável em cima das funções puras de complexity.rules.ts, para
// ser consumido via DI pelos módulos que efetivamente orquestram I/O
// (Importador no Bloco C, Diagnóstico no Bloco D). Nenhuma lógica de negócio
// mora aqui — só delega.
@Injectable()
export class ComplexityService {
  evaluate(input: EvaluateComplexityInput): EvaluateComplexityResult {
    return evaluateComplexity(input);
  }

  calculateVolumeScore(input: VolumeInput): VolumeResult {
    return calculateVolumeScore(input);
  }

  calculateCoefficients(records: AssessmentRecord[]): CoefficientResult {
    return calculateCoefficients(records);
  }
}
