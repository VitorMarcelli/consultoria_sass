import { Injectable } from '@nestjs/common';
import { PrismaClientManager } from '../prisma/prisma-client-manager';
import { DashboardService } from '../dashboard/dashboard.service';

// Camada de dados do Assistente de IA — só leitura, sempre escopada a um
// tenantId resolvido pelo caller (nunca recebido do LLM). Reaproveita o
// DashboardService já existente (mesmos números que o Painel Gerencial
// mostra) em vez de duplicar consultas.
@Injectable()
export class AssistantDataService {
  constructor(
    private readonly prismaManager: PrismaClientManager,
    private readonly dashboardService: DashboardService,
  ) {}

  private getTenantPrisma(tenantId: string) {
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  private async getCurrentCycle(tenantId: string) {
    const prisma = this.getTenantPrisma(tenantId);
    return prisma.managementCycle.findFirst({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  // Sem front informado -> todas as frentes ativas do tenant.
  private async resolveFronts(tenantId: string, frontName?: string) {
    const prisma = this.getTenantPrisma(tenantId);
    const fronts = await prisma.operationalFront.findMany({
      where: { status: 'ACTIVE' },
    });
    if (!frontName) return fronts;
    const match = fronts.find((f) =>
      f.name.toLowerCase().includes(frontName.toLowerCase().trim()),
    );
    return match ? [match] : [];
  }

  async portfolioOverview(tenantId: string, frontName?: string) {
    const cycle = await this.getCurrentCycle(tenantId);
    if (!cycle) {
      return { error: 'Nenhum ciclo de gestão aberto para este escritório ainda.' };
    }

    const fronts = await this.resolveFronts(tenantId, frontName);
    if (fronts.length === 0) {
      return { error: `Frente "${frontName}" não encontrada neste escritório.` };
    }

    const results = [];
    for (const front of fronts) {
      const mapping = await this.dashboardService.getCycleMapping(
        tenantId,
        cycle.id,
        front.id,
      );
      results.push({ front: front.name, ...mapping });
    }
    return { cycle: `${cycle.month}/${cycle.year}`, fronts: results };
  }

  async capacityOverview(tenantId: string, frontName?: string) {
    const cycle = await this.getCurrentCycle(tenantId);
    if (!cycle) {
      return { error: 'Nenhum ciclo de gestão aberto para este escritório ainda.' };
    }

    let frontId = 'all';
    let frontLabel = 'Todas as frentes';
    if (frontName) {
      const fronts = await this.resolveFronts(tenantId, frontName);
      if (fronts.length === 0) {
        return { error: `Frente "${frontName}" não encontrada neste escritório.` };
      }
      frontId = fronts[0].id;
      frontLabel = fronts[0].name;
    }

    const capacity = await this.dashboardService.getCapacityPlanning(
      tenantId,
      cycle.id,
      frontId,
    );
    return { cycle: `${cycle.month}/${cycle.year}`, front: frontLabel, ...capacity };
  }

  async findClients(
    tenantId: string,
    filters: {
      front?: string;
      complexityClass?: string;
      status?: string;
      ownerName?: string;
    },
  ) {
    const prisma = this.getTenantPrisma(tenantId);
    const fronts = await this.resolveFronts(tenantId, filters.front);
    if (filters.front && fronts.length === 0) {
      return { error: `Frente "${filters.front}" não encontrada neste escritório.` };
    }
    const frontIds = filters.front ? fronts.map((f) => f.id) : undefined;

    const classifications = await prisma.clientFrontClassification.findMany({
      where: {
        ...(frontIds ? { frontId: { in: frontIds } } : {}),
        ...(filters.complexityClass
          ? { complexityClass: filters.complexityClass.toUpperCase() }
          : {}),
      },
      include: { client: true, front: true, operator1: true },
      take: 200,
    });

    const filtered = classifications.filter((c) => {
      if (filters.status && c.client.status !== filters.status.toUpperCase())
        return false;
      if (
        filters.ownerName &&
        !c.operator1?.name
          ?.toLowerCase()
          .includes(filters.ownerName.toLowerCase())
      )
        return false;
      return true;
    });

    return {
      total: filtered.length,
      // Corta em 50 pra não estourar o contexto do modelo com carteiras
      // grandes — se precisar de mais, quem pergunta pode refinar o filtro.
      truncated: filtered.length > 50,
      clients: filtered.slice(0, 50).map((c) => ({
        name: c.client.name,
        front: c.front.name,
        complexityClass: c.complexityClass,
        assessmentState: c.assessmentState,
        owner: c.operator1?.name || null,
        status: c.client.status,
      })),
    };
  }

  async clientDetail(tenantId: string, clientName: string) {
    const prisma = this.getTenantPrisma(tenantId);
    const client = await prisma.client.findFirst({
      where: { name: { contains: clientName, mode: 'insensitive' } },
      include: {
        frontClassifications: {
          include: { front: true, operator1: true, operator2: true, leader: true },
        },
      },
    });
    if (!client) {
      return { error: `Nenhum cliente encontrado com o nome "${clientName}".` };
    }

    return {
      name: client.name,
      cnpj: client.cnpj,
      status: client.status,
      taxRegime: client.taxRegime,
      segment: client.segment,
      monthlyFee: client.monthlyFee,
      fronts: client.frontClassifications.map((fc) => ({
        front: fc.front.name,
        actsInFront: fc.actsInFront,
        assessmentState: fc.assessmentState,
        complexityClass: fc.complexityClass,
        normalizedScore: fc.normalizedScore,
        scores: {
          volume: fc.scoreVolume,
          atendimento: fc.scoreService,
          tributacao: fc.scoreTax,
          organizacao: fc.scoreOrganization,
          rotatividade: fc.scoreTurnover,
        },
        responsavelPrincipal: fc.operator1?.name || null,
        responsavelSecundario: fc.operator2?.name || null,
        lider: fc.leader?.name || null,
        // Justificativa por critério, quando a IA já sugeriu notas pra este
        // cliente (ver backend/src/complexity-ai) — é o que responde
        // perguntas tipo "por que esse cliente ficou C3?".
        justificativaIA: fc.aiSuggestion || null,
      })),
    };
  }
}
