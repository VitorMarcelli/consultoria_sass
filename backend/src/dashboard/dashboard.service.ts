import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientManager } from '../prisma/prisma-client-manager';
import { ComplexityService } from '../complexity/complexity.service';
import { AssessmentState } from '../complexity/complexity.rules';

const COMPLEXITY_CLASSES = ['C1', 'C2', 'C3', 'C4', 'C5'] as const;
// AI_SUGGESTED entra aqui pelo mesmo motivo de IMPORTED: nenhum humano
// revisou a nota ainda. Sem ele, um registro sugerido pela IA não caía nem em
// `assessedPortfolio` nem em `pendingCount` e sumia da soma da tela.
const PENDING_STATES: AssessmentState[] = [
  'NOT_ASSESSED',
  'PARTIAL',
  'IMPORTED',
  'AI_SUGGESTED',
];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prismaManager: PrismaClientManager,
    private readonly complexityService: ComplexityService,
  ) {}

  private getTenantPrisma(tenantId: string) {
    if (!tenantId)
      throw new NotFoundException('ID do escritório não informado.');
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  private async getCompetenceFromCycle(
    tenantId: string,
    cycleId: string,
  ): Promise<string> {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    const cycle = await tenantPrisma.managementCycle.findUnique({
      where: { id: cycleId },
    });
    if (!cycle) throw new Error('Cycle not found');
    const monthStr = cycle.month.toString().padStart(2, '0');
    return `${monthStr}/${cycle.year}`;
  }

  // D1: lê a carteira (ClientCycleSnapshot > ClientFrontClassification),
  // nunca Delivery — um escritório sem nenhuma entrega cadastrada no ciclo
  // não pode ver um diagnóstico vazio só por isso.
  async getCycleMapping(tenantId: string, cycleId: string, frontId: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    const snapshots = await tenantPrisma.clientCycleSnapshot.findMany({
      where: { cycleId, frontId },
      include: { client: true },
    });

    interface PortfolioRecord {
      client: {
        id: string;
        status: string;
        taxRegime: string | null;
        segment: string | null;
      };
      complexityClass: string | null;
      assessmentState: AssessmentState;
      normalizedScore: number | null;
      primaryOwnerId: string | null;
    }

    let portfolio: PortfolioRecord[];
    if (snapshots.length > 0) {
      // Retrato congelado do ciclo — prioridade 1 (D1).
      //
      // Snapshots criados antes da ORDEM-02/Bloco B nasceram sem os campos de
      // avaliação (a ORDEM-01 adicionou as colunas mas nenhum caminho de
      // criação as preenchia). Na base real isso é a maioria: 96% sem
      // complexityClass e 100% sem primaryOwnerId — ou seja, curva vazia e
      // tabela de CCR sem nenhuma linha. Para esses, caímos na classificação
      // viva; o congelado continua tendo precedência sempre que existir.
      const classifications =
        await tenantPrisma.clientFrontClassification.findMany({
          where: {
            frontId,
            clientId: { in: snapshots.map((s) => s.clientId) },
          },
        });
      const liveByClient = new Map(
        classifications.map((c) => [c.clientId, c]),
      );

      portfolio = snapshots.map((s) => {
        const live = liveByClient.get(s.clientId);
        return {
          client: s.client,
          complexityClass: s.complexityClass ?? live?.complexityClass ?? null,
          assessmentState: (s.complexityClass
            ? (s.assessmentState ?? 'NOT_ASSESSED')
            : (live?.assessmentState ??
              s.assessmentState ??
              'NOT_ASSESSED')) as AssessmentState,
          normalizedScore: s.complexityClass
            ? s.normalizedScore
            : (live?.normalizedScore ?? null),
          primaryOwnerId: s.primaryOwnerId ?? live?.operator1Id ?? null,
        };
      });
    } else {
      // Sem snapshot: carteira viva de quem atua na frente — prioridade 2 (D1).
      const classifications =
        await tenantPrisma.clientFrontClassification.findMany({
          where: { frontId, actsInFront: 'YES' },
          include: { client: true },
        });
      portfolio = classifications.map((c) => ({
        client: c.client,
        complexityClass: c.complexityClass,
        assessmentState: (c.assessmentState ??
          'NOT_ASSESSED') as AssessmentState,
        normalizedScore: c.normalizedScore,
        primaryOwnerId: c.operator1Id, // D3: responsável principal da frente
      }));
    }

    // "Ativos" para fins de cobertura/curva/CCA = clientes com Client.status
    // ACTIVE (independente de estarem no snapshot congelado ou na carteira
    // viva — os dois já só contêm quem atua na frente).
    const activePortfolio = portfolio.filter(
      (p) => p.client.status === 'ACTIVE',
    );
    const assessedPortfolio = activePortfolio.filter(
      (p) => p.assessmentState === 'ASSESSED',
    );

    // statusData: sempre ao vivo a partir de actsInFront (YES/NO/NO_MOVEMENT)
    // de TODA a ClientFrontClassification da frente — é a única fonte com um
    // terceiro estado ("sem movimento"); Client.status só tem ACTIVE/INACTIVE
    // e o snapshot não cobre quem não atua na frente.
    const allClassifications =
      await tenantPrisma.clientFrontClassification.findMany({
        where: { frontId },
      });
    const statusData = {
      ativos: allClassifications.filter((c) => c.actsInFront === 'YES').length,
      inativos: allClassifications.filter((c) => c.actsInFront === 'NO').length,
      semMovimento: allClassifications.filter(
        (c) => c.actsInFront === 'NO_MOVEMENT',
      ).length,
      total: allClassifications.length,
    };

    // Tributação e segmento a partir da carteira ativa (não mais de entregas).
    const regimesMap = new Map<string, number>();
    const segmentsMap = new Map<string, number>();
    activePortfolio.forEach((p) => {
      const regime = p.client.taxRegime || 'Não Informado';
      const segment = p.client.segment || 'Não Informado';
      regimesMap.set(regime, (regimesMap.get(regime) || 0) + 1);
      segmentsMap.set(segment, (segmentsMap.get(segment) || 0) + 1);
    });
    const formatMap = (map: Map<string, number>) =>
      Array.from(map.entries()).map(([name, value]) => ({ name, value }));

    // D2: curva de complexidade real (nunca mais prioridade da entrega).
    // C0 e pendentes ficam fora da curva, expostos à parte (nunca somados a C1).
    const c0Count = activePortfolio.filter(
      (p) => p.assessmentState === 'NOT_APPLICABLE',
    ).length;
    const pendingCount = activePortfolio.filter((p) =>
      PENDING_STATES.includes(p.assessmentState),
    ).length;

    const classCounts: Record<string, number> = {};
    assessedPortfolio.forEach((p) => {
      if (p.complexityClass) {
        classCounts[p.complexityClass] =
          (classCounts[p.complexityClass] || 0) + 1;
      }
    });
    const complexityCurve = COMPLEXITY_CLASSES.map((cls) => ({
      class: cls,
      count: classCounts[cls] || 0,
      percent:
        assessedPortfolio.length > 0
          ? round2(((classCounts[cls] || 0) / assessedPortfolio.length) * 100)
          : 0,
    }));

    // D3/D4: CCA/CCR via motor de complexidade (Bloco B) + enriquecimento
    // com nome do responsável e quebra por classe (o motor não conhece nome
    // de funcionário nem complexityClass, só normalizedScore).
    const coefficients = this.complexityService.calculateCoefficients(
      activePortfolio.map((p) => ({
        assessmentState: p.assessmentState,
        normalizedScore: p.normalizedScore,
        primaryOwnerId: p.primaryOwnerId,
      })),
    );

    const employees = await tenantPrisma.employee.findMany();
    const employeeNameById = new Map(employees.map((e) => [e.id, e.name]));

    const byOwner = coefficients.byOwner.map((owner) => {
      const ownerAssessed = assessedPortfolio.filter(
        (p) => p.primaryOwnerId === owner.ownerId,
      );
      const byClass: Record<string, number> = {};
      COMPLEXITY_CLASSES.forEach((cls) => {
        byClass[cls] = ownerAssessed.filter(
          (p) => p.complexityClass === cls,
        ).length;
      });
      return {
        ownerId: owner.ownerId,
        ownerName: employeeNameById.get(owner.ownerId) || 'Desconhecido',
        total: owner.count,
        byClass,
        ccr: owner.ccr,
        distance: owner.distance,
      };
    });

    return {
      coverage: {
        totalClients: portfolio.length,
        activeClients: activePortfolio.length,
        assessedClients: assessedPortfolio.length,
        coveragePercent: coefficients.coveragePercent,
      },
      statusData,
      taxRegimes: formatMap(regimesMap),
      segments: formatMap(segmentsMap),
      complexityCurve,
      c0Count,
      pendingCount,
      cca: coefficients.cca,
      byOwner,
    };
  }

  async getCapacityPlanning(
    tenantId: string,
    cycleId: string,
    frontId: string,
  ) {
    const competence = await this.getCompetenceFromCycle(tenantId, cycleId);
    const tenantPrisma = this.getTenantPrisma(tenantId);

    const allocWhere =
      frontId === 'all'
        ? { cycleId, status: 'ACTIVE' }
        : { cycleId, frontId, status: 'ACTIVE' };
    const allocations = await tenantPrisma.employeeCycleAllocation.findMany({
      where: allocWhere,
      include: { employee: true },
    });

    const uniqueEmployees = new Map();
    allocations.forEach((a) => uniqueEmployees.set(a.employeeId, a));
    const uniqueAllocations = Array.from(uniqueEmployees.values());

    // 2. Buscamos as entregas do ciclo
    const delWhere =
      frontId === 'all' ? { competence } : { frontId, competence };
    const deliveries = await tenantPrisma.delivery.findMany({
      where: delWhere,
      include: { responsible: true },
    });

    const timeByEmployee = new Map<string, number>(); // Tempo em minutos
    deliveries.forEach((d) => {
      const empId = d.responsibleId;
      const time = d.estimatedTimeMinutes || 0;
      timeByEmployee.set(empId, (timeByEmployee.get(empId) || 0) + time);
    });

    // Extra/Retrabalho vêm de apontamentos reais (TimeLog) dentro do mês do
    // ciclo — 'recurrent' continua sendo a estimativa das entregas (baseline
    // que funciona desde o dia 1, mesmo antes de a equipe apontar tempo).
    const [monthStr, yearStr] = competence.split('/');
    const monthStart = new Date(Number(yearStr), Number(monthStr) - 1, 1);
    const monthEnd = new Date(Number(yearStr), Number(monthStr), 1);
    const employeeIds = uniqueAllocations.map((a) => a.employeeId);

    const realLogs = employeeIds.length
      ? await tenantPrisma.timeLog.findMany({
          where: {
            employeeId: { in: employeeIds },
            status: 'FINISHED',
            type: { in: ['EXTRA', 'REWORK'] },
            startTime: { gte: monthStart, lt: monthEnd },
          },
        })
      : [];

    const extraMinutesByEmployee = new Map<string, number>();
    const reworkMinutesByEmployee = new Map<string, number>();
    realLogs.forEach((log) => {
      const mins = log.durationMinutes || 0;
      const map =
        log.type === 'REWORK'
          ? reworkMinutesByEmployee
          : extraMinutesByEmployee;
      map.set(log.employeeId, (map.get(log.employeeId) || 0) + mins);
    });

    const capacityData = uniqueAllocations.map((alloc) => {
      // O fallback de 6h entra em silêncio quando ninguém preencheu a
      // disponibilidade real — hasExplicitAvailability deixa a tela avisar
      // que aquele denominador é um chute, não um dado informado (Bloco E).
      const hasExplicitAvailability = alloc.dailyAvailableTime != null;
      const dailyHours = alloc.dailyAvailableTime || 6; // Default to 6 hours
      const availableHours = dailyHours * 21; // ex: 21 dias uteis no mes
      const estimatedMinutes = timeByEmployee.get(alloc.employeeId) || 0;
      const estimatedHours = Math.floor(estimatedMinutes / 60);

      const recurrent = estimatedHours;
      const extra = Math.floor(
        (extraMinutesByEmployee.get(alloc.employeeId) || 0) / 60,
      );
      const rework = Math.floor(
        (reworkMinutesByEmployee.get(alloc.employeeId) || 0) / 60,
      );
      const committed = recurrent + extra + rework;
      const idleHours = Math.max(0, availableHours - committed);
      const utilizationPercent =
        availableHours > 0 ? Math.round((committed / availableHours) * 100) : 0;

      let status: 'OVERLOADED' | 'IDLE' | 'BALANCED' = 'BALANCED';
      if (utilizationPercent > 100) status = 'OVERLOADED';
      else if (utilizationPercent < 70) status = 'IDLE';

      return {
        employeeId: alloc.employeeId,
        employee: alloc.employee.name,
        available: availableHours,
        dailyAvailable: dailyHours,
        recurrent,
        extra,
        rework,
        committed,
        idleHours,
        utilizationPercent,
        status,
        hasExplicitAvailability,
      };
    });

    return {
      capacityData,
      employeesWithoutAvailability: capacityData.filter(
        (c) => !c.hasExplicitAvailability,
      ).length,
    };
  }

  async getDailyLeveling(tenantId: string, cycleId: string, frontId: string) {
    const competence = await this.getCompetenceFromCycle(tenantId, cycleId);
    const tenantPrisma = this.getTenantPrisma(tenantId);

    // Busca todas as entregas do ciclo/frente para montar o Gráfico Heijunka
    const deliveries = await tenantPrisma.delivery.findMany({
      where: { frontId, competence },
      include: {
        responsible: true,
        client: true,
      },
    });

    // Agrupar por data de execução (executionDeadline)
    const dailyCount = new Map<string, number>();

    deliveries.forEach((d) => {
      if (d.executionDeadline) {
        // Normaliza a data para YYYY-MM-DD local
        const dateStr = d.executionDeadline.toISOString().split('T')[0];
        dailyCount.set(dateStr, (dailyCount.get(dateStr) || 0) + 1);
      }
    });

    // Ordenar cronologicamente
    const sortedTimeline = Array.from(dailyCount.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, deliveries: count }));

    return {
      timeline: sortedTimeline,
      deliveriesList: deliveries, // Manda a lista filtrada para o front-end
    };
  }

  async rescheduleBulkDeliveries(
    tenantId: string,
    deliveryIds: string[],
    newDateStr: string,
  ) {
    const newDate = new Date(newDateStr); // YYYY-MM-DD
    const tenantPrisma = this.getTenantPrisma(tenantId);

    // Atualiza o executionDeadline em lote
    await tenantPrisma.delivery.updateMany({
      where: {
        id: { in: deliveryIds },
      },
      data: {
        executionDeadline: newDate,
      },
    });

    return { success: true, count: deliveryIds.length };
  }
}
