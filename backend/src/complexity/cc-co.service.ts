import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientManager } from '../prisma/prisma-client-manager';
import { ComplexityFront } from '../client-catalog/client-catalog.types';
import {
  assessClient,
  assessFront,
  assessPortfolio,
  AggregateResult,
  FrontAssessmentResult,
} from './cc-co.rules';
import {
  buildFrontInput,
  isClientActive,
  resolveFront,
} from './cc-co.input';

// Orquestra o motor CC/CO: lê do banco, chama as funções puras, grava o
// resultado. Nenhuma regra de negócio mora aqui — o cálculo está em
// cc-co.rules.ts e a montagem da entrada em cc-co.input.ts.
//
// O motor antigo (ComplexityService, escala 1..3) continua existindo e
// servindo as telas atuais. Os dois convivem até a troca ser concluída.

// Mescla incremental das respostas: o formulário salva um passo por vez sem
// apagar o que já foi respondido nos outros. O retorno é tipado como
// Prisma.InputJsonValue porque o campo é Json e o cliente do Prisma não
// aceita Record<string, unknown> direto.
function mergeAnswers(
  current: unknown,
  incoming: Record<string, any>,
): Prisma.InputJsonValue {
  const base =
    current && typeof current === 'object' && !Array.isArray(current)
      ? (current as Record<string, any>)
      : {};
  return { ...base, ...incoming } as Prisma.InputJsonValue;
}

@Injectable()
export class CcCoService {
  constructor(private readonly prismaManager: PrismaClientManager) {}

  private getTenantPrisma(tenantId: string) {
    if (!tenantId)
      throw new NotFoundException('ID do escritório não informado.');
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  // Grava as respostas do catálogo e recalcula na sequência. As respostas do
  // bloco MESTRE vão no Client (valem para todas as frentes); as da frente vão
  // na classificação. O merge é incremental: o formulário pode salvar um passo
  // por vez sem apagar o que já foi respondido nos outros.
  async saveAnswers(
    tenantId: string,
    clientId: string,
    frontId: string,
    payload: {
      profileType?: string | null;
      masterAnswers?: Record<string, any>;
      frontAnswers?: Record<string, any>;
    },
  ) {
    const prisma = this.getTenantPrisma(tenantId);

    if (payload.masterAnswers || payload.profileType !== undefined) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { catalogAnswers: true },
      });
      if (!client) throw new NotFoundException('Cliente não encontrado.');

      await prisma.client.update({
        where: { id: clientId },
        data: {
          ...(payload.profileType !== undefined
            ? { profileType: payload.profileType || null }
            : {}),
          ...(payload.masterAnswers
            ? {
                catalogAnswers: mergeAnswers(
                  client.catalogAnswers,
                  payload.masterAnswers,
                ),
              }
            : {}),
        },
      });
    }

    if (payload.frontAnswers) {
      const existing = await prisma.clientFrontClassification.findUnique({
        where: { clientId_frontId: { clientId, frontId } },
        select: { catalogAnswers: true },
      });
      if (!existing)
        throw new NotFoundException(
          'Cliente não está alocado nesta frente.',
        );

      await prisma.clientFrontClassification.update({
        where: { clientId_frontId: { clientId, frontId } },
        data: {
          catalogAnswers: mergeAnswers(
            existing.catalogAnswers,
            payload.frontAnswers,
          ),
        },
      });
    }

    return this.assessAndPersist(tenantId, clientId, frontId);
  }

  // Recalcula uma frente de um cliente e grava o resultado. É o único ponto
  // que escreve ccScore/coScore/ccClass/coClass/ccState/coState — nenhuma tela
  // pode digitar esses valores.
  async assessAndPersist(
    tenantId: string,
    clientId: string,
    frontId: string,
  ): Promise<FrontAssessmentResult | null> {
    const prisma = this.getTenantPrisma(tenantId);

    const classification = await prisma.clientFrontClassification.findUnique({
      where: { clientId_frontId: { clientId, frontId } },
      include: { client: true, front: true, hrInfo: true },
    });
    if (!classification)
      throw new NotFoundException('Cliente não está alocado nesta frente.');

    const front = resolveFront(classification.front?.name);
    // Frente com nome que não casa com nenhuma das três do motor: não dá para
    // calcular, e inventar um palpite seria pior. O registro fica sem índice
    // e o escritório precisa renomear ou mapear a frente.
    if (!front) return null;

    const result = assessFront(
      buildFrontInput(front, classification.client, classification),
    );

    await prisma.clientFrontClassification.update({
      where: { clientId_frontId: { clientId, frontId } },
      data: {
        ccScore: result.cc.value,
        coScore: result.co.value,
        ccClass: result.cc.class,
        coClass: result.co.class,
        ccState: result.cc.state,
        coState: result.co.state,
      },
    });

    return result;
  }

  // Recalcula todas as frentes de um cliente e devolve o consolidado.
  async assessClientAllFronts(tenantId: string, clientId: string) {
    const prisma = this.getTenantPrisma(tenantId);

    const classifications = await prisma.clientFrontClassification.findMany({
      where: { clientId },
      include: { client: true, front: true, hrInfo: true },
    });

    const fronts: (FrontAssessmentResult & { frontId: string; frontName: string })[] =
      [];

    for (const c of classifications) {
      const front = resolveFront(c.front?.name);
      if (!front) continue;
      const result = assessFront(buildFrontInput(front, c.client, c));
      await prisma.clientFrontClassification.update({
        where: { id: c.id },
        data: {
          ccScore: result.cc.value,
          coScore: result.co.value,
          ccClass: result.cc.class,
          coClass: result.co.class,
          ccState: result.cc.state,
          coState: result.co.state,
        },
      });
      fronts.push({
        ...result,
        frontId: c.frontId,
        frontName: c.front?.name ?? '',
      });
    }

    return { fronts, consolidated: assessClient(fronts) };
  }

  // Índices da carteira. Sem frontId, consolida o escritório inteiro pelo
  // pool de observações cliente-frente — mesma base da aba de lógica do
  // template, e não a média das médias de cada área.
  async getPortfolioAssessment(
    tenantId: string,
    frontId?: string,
  ): Promise<AggregateResult & { front: ComplexityFront | null }> {
    const prisma = this.getTenantPrisma(tenantId);

    const classifications = await prisma.clientFrontClassification.findMany({
      where: frontId ? { frontId } : {},
      include: { client: true, front: true },
    });

    // Mesma regra de "ativo" usada em buildFrontInput. Duplicar a checagem
    // aqui faria "Sem Movimento" contar na carteira e não contar no cálculo
    // da frente — o índice do escritório deixaria de bater com a soma das
    // partes.
    const records = classifications.map((c) => ({
      active: c.actsInFront === 'YES' && isClientActive(c.client?.status),
      cc: c.ccScore,
      co: c.coScore,
    }));

    const resolved = frontId
      ? resolveFront(classifications[0]?.front?.name)
      : null;

    return { ...assessPortfolio(records), front: resolved };
  }
}
