import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientManager } from '../prisma/prisma-client-manager';
import { ComplexityService } from '../complexity/complexity.service';
import { FrontType, CriteriaScores } from '../complexity/complexity.rules';
import { ComplexityAiLlmClient } from './llm-client';
import {
  buildPrompt,
  buildOutputSchema,
  ClientFrontContext,
} from './prompts/build-prompt';
import { PROMPT_VERSION } from './prompts/rubrics';

// OperationalFront.name é texto livre por tenant (ver complexity.rules.ts) —
// mesma resolução usada em imports.service.ts (getFront), só que na direção
// inversa: aqui já temos o nome cadastrado e precisamos do FrontType fixo
// que o motor entende.
const FRONT_TYPE_BY_NAME: Record<string, FrontType> = {
  fiscal: 'FISCAL',
  contabil: 'CONTABIL',
  'contábil': 'CONTABIL',
  pessoal: 'PESSOAL',
};

function resolveFrontType(frontName: string): FrontType | null {
  return FRONT_TYPE_BY_NAME[frontName.toLowerCase().trim()] ?? null;
}

@Injectable()
export class ComplexityAiService {
  private readonly logger = new Logger(ComplexityAiService.name);

  constructor(
    private readonly prismaManager: PrismaClientManager,
    private readonly complexityService: ComplexityService,
    private readonly llmClient: ComplexityAiLlmClient,
  ) {}

  private getTenantPrisma(tenantId: string) {
    if (!tenantId)
      throw new NotFoundException('ID do escritório não informado.');
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  async suggestForClassification(tenantId: string, classificationId: string) {
    const prisma = this.getTenantPrisma(tenantId);

    const classification = await prisma.clientFrontClassification.findUnique({
      where: { id: classificationId },
      include: {
        client: true,
        front: true,
        taxInfo: true,
        hrInfo: true,
        accountingInfo: true,
      },
    });
    if (!classification) {
      throw new NotFoundException('Classificação não encontrada.');
    }

    const front = resolveFrontType(classification.front.name);
    if (!front) {
      throw new NotFoundException(
        `Frente "${classification.front.name}" não reconhecida pelo motor de complexidade (esperado Fiscal, Contábil ou Pessoal).`,
      );
    }

    if (
      classification.actsInFront !== 'YES' ||
      classification.client.status !== 'ACTIVE'
    ) {
      // Motor já classifica isso como C0/NOT_APPLICABLE automaticamente —
      // não há nota para sugerir.
      return {
        applied: false,
        reason:
          'Cliente inativo ou sem atuação nesta frente — nada a sugerir.',
        classificationId,
      };
    }

    if (!this.llmClient.isConfigured()) {
      return {
        applied: false,
        reason: 'IA não configurada (variável de ambiente ausente).',
        classificationId,
      };
    }

    const context = this.buildContext(front, classification);
    const prompt = buildPrompt(context);
    const schema = buildOutputSchema(front);

    const suggestion = await this.llmClient.generateStructured(prompt, schema);
    if (!suggestion) {
      return {
        applied: false,
        reason: 'Falha ao gerar sugestão (ver logs do servidor).',
        classificationId,
      };
    }

    const scores: CriteriaScores = {
      // Volume nunca é sugerido pela IA — é sempre calculado à parte
      // (calculateVolumeScore) e só é reaproveitado aqui como já estava.
      scoreVolume: classification.scoreVolume,
      scoreService: suggestion.scoreService?.score ?? null,
      scoreTax: front === 'PESSOAL' ? null : suggestion.scoreTax?.score ?? null,
      scoreOrganization: suggestion.scoreOrganization?.score ?? null,
      scoreTurnover:
        front === 'PESSOAL' ? suggestion.scoreTurnover?.score ?? null : null,
    };

    const evaluation = this.complexityService.evaluate({
      front,
      actsInFront: classification.actsInFront,
      clientStatus: classification.client.status,
      scores,
    });

    const aiSuggestion = {
      scores: suggestion,
      model: this.llmClient.modelIdentifier,
      promptVersion: PROMPT_VERSION,
      generatedAt: new Date().toISOString(),
    };

    const updated = await prisma.clientFrontClassification.update({
      where: { id: classificationId },
      data: {
        scoreService: scores.scoreService,
        scoreTax: scores.scoreTax,
        scoreOrganization: scores.scoreOrganization,
        scoreTurnover: scores.scoreTurnover,
        rawSum: evaluation.rawSum,
        normalizedScore: evaluation.normalizedScore,
        complexityClass: evaluation.complexityClass,
        // Só marca AI_SUGGESTED quando todos os critérios aplicáveis vieram
        // preenchidos (evaluation.assessmentState === 'ASSESSED'); se algum
        // critério ficou sem dado suficiente, preserva PARTIAL/NOT_ASSESSED
        // do próprio motor — nunca finge uma avaliação completa.
        assessmentState:
          evaluation.assessmentState === 'ASSESSED'
            ? 'AI_SUGGESTED'
            : evaluation.assessmentState,
        // Prisma.InputJsonValue exige index signature explícita — o shape
        // de aiSuggestion é interno a este service, não parte do contrato
        // do banco, então o cast é seguro aqui (mesmo dado, só o tipo).
        aiSuggestion: aiSuggestion as unknown as Prisma.InputJsonValue,
      },
    });

    return { applied: true, classification: updated };
  }

  // Fecha o loop humano: transforma AI_SUGGESTED (ou PARTIAL, se o consultor
  // completar o que faltou via `overrides`) em ASSESSED — só assim o
  // registro passa a contar em CCA/CCR (ver AssessmentState em
  // complexity.rules.ts). `overrides` permite ao consultor corrigir
  // qualquer nota antes de confirmar, sem precisar rodar a IA de novo.
  // Não existia nenhum caminho pra isso antes deste método: a tela de
  // edição existente (client-classifications.service.ts) só mexe em
  // responsáveis/perfil operacional, nunca nas notas de complexidade.
  async acceptSuggestion(
    tenantId: string,
    classificationId: string,
    userId: string,
    overrides?: Partial<
      Pick<
        CriteriaScores,
        'scoreService' | 'scoreTax' | 'scoreOrganization' | 'scoreTurnover'
      >
    >,
  ) {
    const prisma = this.getTenantPrisma(tenantId);

    const classification = await prisma.clientFrontClassification.findUnique({
      where: { id: classificationId },
      include: { client: true, front: true },
    });
    if (!classification) {
      throw new NotFoundException('Classificação não encontrada.');
    }

    const front = resolveFrontType(classification.front.name);
    if (!front) {
      throw new NotFoundException(
        `Frente "${classification.front.name}" não reconhecida pelo motor de complexidade.`,
      );
    }

    const scores: CriteriaScores = {
      scoreVolume: classification.scoreVolume,
      scoreService: overrides?.scoreService ?? classification.scoreService,
      scoreTax: overrides?.scoreTax ?? classification.scoreTax,
      scoreOrganization:
        overrides?.scoreOrganization ?? classification.scoreOrganization,
      scoreTurnover: overrides?.scoreTurnover ?? classification.scoreTurnover,
    };

    const evaluation = this.complexityService.evaluate({
      front,
      actsInFront: classification.actsInFront,
      clientStatus: classification.client.status,
      scores,
    });

    if (evaluation.assessmentState !== 'ASSESSED') {
      throw new BadRequestException(
        'Ainda faltam critérios preenchidos para confirmar esta avaliação — complete as notas restantes (via overrides) antes de aceitar.',
      );
    }

    const updated = await prisma.clientFrontClassification.update({
      where: { id: classificationId },
      data: {
        scoreService: scores.scoreService,
        scoreTax: scores.scoreTax,
        scoreOrganization: scores.scoreOrganization,
        scoreTurnover: scores.scoreTurnover,
        rawSum: evaluation.rawSum,
        normalizedScore: evaluation.normalizedScore,
        complexityClass: evaluation.complexityClass,
        assessmentState: 'ASSESSED',
        assessedById: userId,
        assessedAt: new Date(),
        // aiSuggestion não é apagado: fica como registro histórico do que a
        // IA propôs originalmente, mesmo que o consultor tenha corrigido.
      },
    });

    return { classification: updated };
  }

  async suggestBatchForTenant(tenantId: string, force = false) {
    const prisma = this.getTenantPrisma(tenantId);

    // V1: só cobre o que nunca foi avaliado ou ficou parcial. Reavaliar
    // quem já é AI_SUGGESTED/ASSESSED exige comparar os drivers atuais
    // contra a última sugestão ("rollover por exceção") — fica para uma
    // iteração futura, quando houver escopo por ciclo para ancorar o "antes"
    // e o "depois". `force=true` ignora esse filtro e reprocessa tudo.
    const pending = await prisma.clientFrontClassification.findMany({
      where: {
        actsInFront: 'YES',
        client: { status: 'ACTIVE' },
        ...(force ? {} : { assessmentState: { in: ['NOT_ASSESSED', 'PARTIAL'] } }),
      },
      select: { id: true },
    });

    const results: {
      classificationId: string;
      applied: boolean;
      reason?: string;
    }[] = [];

    for (const row of pending) {
      try {
        const result = await this.suggestForClassification(tenantId, row.id);
        results.push({
          classificationId: row.id,
          applied: result.applied,
          reason: 'reason' in result ? result.reason : undefined,
        });
      } catch (error) {
        this.logger.warn(
          `Falha ao sugerir complexidade para ${row.id}: ${(error as Error).message}`,
        );
        results.push({
          classificationId: row.id,
          applied: false,
          reason: (error as Error).message,
        });
      }
    }

    return {
      total: pending.length,
      applied: results.filter((r) => r.applied).length,
      results,
    };
  }

  private buildContext(
    front: FrontType,
    classification: any,
  ): ClientFrontContext {
    return {
      front,
      clientName: classification.client.name,
      taxRegime: classification.client.taxRegime,
      segment: classification.client.segment,
      frequency: classification.frequency,
      particulars: classification.particulars,

      hasSpecialRegime: classification.taxInfo?.hasSpecialRegime ?? null,
      specialRegimeDescription:
        classification.taxInfo?.specialRegimeDescription ?? null,
      automationLevel: classification.taxInfo?.automationLevel ?? null,
      meetsDeadlines: classification.taxInfo?.meetsDeadlines ?? null,
      documentReceiptMethod:
        classification.taxInfo?.documentReceiptMethod ??
        classification.accountingInfo?.documentReceiptMethod ??
        classification.hrInfo?.documentReceiptMethod ??
        null,
      documentSendMethod:
        classification.taxInfo?.documentSendMethod ??
        classification.accountingInfo?.documentSendMethod ??
        null,
      integrationMethod:
        classification.taxInfo?.integrationMethod ??
        classification.accountingInfo?.integrationMethod ??
        null,

      bookkeepingRegime: classification.accountingInfo?.bookkeepingRegime ?? null,
      lastClosingMonth: classification.accountingInfo?.lastClosingMonth ?? null,
      lastReconciliationMonth:
        classification.accountingInfo?.lastReconciliationMonth ?? null,
      closingPeriod: classification.accountingInfo?.closingPeriod ?? null,
      infoReceiptFrequency:
        classification.accountingInfo?.infoReceiptFrequency ?? null,
      integrationLevel: classification.accountingInfo?.integrationLevel ?? null,
      trialBalanceNeed: classification.accountingInfo?.trialBalanceNeed ?? null,

      employeesCount: classification.hrInfo?.employeesCount ?? null,
      prolaboreCount: classification.hrInfo?.prolaboreCount ?? null,
      domesticsCount: classification.hrInfo?.domesticsCount ?? null,
      pointReceiptMethod: classification.hrInfo?.pointReceiptMethod ?? null,
      variablesLaunchMethod:
        classification.hrInfo?.variablesLaunchMethod ?? null,
      processingType: classification.hrInfo?.processingType ?? null,
      sheetSendingMethod: classification.hrInfo?.sheetSendingMethod ?? null,
      frequentAdmissions: classification.hrInfo?.frequentAdmissions ?? null,
    };
  }
}
