import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientManager } from '../prisma/prisma-client-manager';
import { ComplexityService } from '../complexity/complexity.service';
import { assessPortfolio } from '../complexity/cc-co.rules';
import { isClientActive } from '../complexity/cc-co.input';
import { AssessmentState } from '../complexity/complexity.rules';

const COMPLEXITY_CLASSES = ['C1', 'C2', 'C3', 'C4', 'C5'] as const;
// Classes do motor CC/CO. C0 fica fora: frente inativa nao entra em media.
const CC_CO_CLASSES = ['C1', 'C2', 'C3', 'C4', 'C5'];
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
      active: boolean;
      cc: number | null;
      co: number | null;
      ccClass: string | null;
      coClass: string | null;
      primaryOwnerId: string | null;
    }

    // Snapshots criados antes da ORDEM-02 nasceram sem os campos de avaliacao.
    // Para esses caimos na classificacao viva; o congelado tem precedencia
    // sempre que existir.
    const classifications =
      await tenantPrisma.clientFrontClassification.findMany({
        where: { frontId },
        include: { client: true },
      });
    const liveByClient = new Map(classifications.map((c: any) => [c.clientId, c]));

    let portfolio: PortfolioRecord[];
    if (snapshots.length > 0) {
      portfolio = snapshots.map((s: any) => {
        const live: any = liveByClient.get(s.clientId);
        const congelado = s.ccScore != null || s.coScore != null;
        const fonte: any = congelado ? s : (live ?? s);
        return {
          client: s.client,
          active:
            (live?.actsInFront ?? 'YES') === 'YES' &&
            isClientActive(s.client?.status),
          cc: fonte.ccScore ?? null,
          co: fonte.coScore ?? null,
          ccClass: fonte.ccClass ?? null,
          coClass: fonte.coClass ?? null,
          primaryOwnerId: s.primaryOwnerId ?? live?.operator1Id ?? null,
        };
      });
    } else {
      portfolio = classifications
        .filter((c: any) => c.actsInFront === 'YES')
        .map((c: any) => ({
          client: c.client,
          active: isClientActive(c.client?.status),
          cc: c.ccScore ?? null,
          co: c.coScore ?? null,
          ccClass: c.ccClass ?? null,
          coClass: c.coClass ?? null,
          primaryOwnerId: c.operator1Id,
        }));
    }

    // Frente inativa e cliente sem movimento ficam fora de toda media
    // (decisao do cliente, 09/09/2026): e ausencia, nao complexidade zero.
    const activePortfolio = portfolio.filter((p) => p.active);
    const avaliados = activePortfolio.filter(
      (p) => p.cc != null && p.co != null,
    );

    // statusData continua vindo ao vivo de actsInFront: e a unica fonte com o
    // terceiro estado ("sem movimento").
    const statusData = {
      ativos: classifications.filter((c: any) => c.actsInFront === 'YES')
        .length,
      inativos: classifications.filter((c: any) => c.actsInFront === 'NO')
        .length,
      semMovimento: classifications.filter(
        (c: any) => c.actsInFront === 'NO_MOVEMENT',
      ).length,
      total: classifications.length,
    };

    const regimesMap = new Map<string, number>();
    const segmentsMap = new Map<string, number>();
    activePortfolio.forEach((p) => {
      const regime = p.client.taxRegime || 'Nao Informado';
      const segment = p.client.segment || 'Nao Informado';
      regimesMap.set(regime, (regimesMap.get(regime) || 0) + 1);
      segmentsMap.set(segment, (segmentsMap.get(segment) || 0) + 1);
    });
    const formatMap = (map: Map<string, number>) =>
      Array.from(map.entries()).map(([name, value]) => ({ name, value }));

    // Duas curvas, nao uma. A da Natureza descreve a carteira que o escritorio
    // tem; a da Maturidade descreve o quanto a operacao ainda pode melhorar —
    // e e a unica das duas sobre a qual ha acao possivel.
    const curva = (campo: 'ccClass' | 'coClass') => {
      const contagem: Record<string, number> = {};
      avaliados.forEach((p) => {
        const cls = p[campo];
        if (cls) contagem[cls] = (contagem[cls] || 0) + 1;
      });
      return CC_CO_CLASSES.map((cls) => ({
        class: cls,
        count: contagem[cls] || 0,
        percent:
          avaliados.length > 0
            ? round2(((contagem[cls] || 0) / avaliados.length) * 100)
            : 0,
      }));
    };

    const carteira = assessPortfolio(
      activePortfolio.map((p) => ({ active: true, cc: p.cc, co: p.co })),
    );

    const employees = await tenantPrisma.employee.findMany();
    const employeeNameById = new Map(employees.map((e) => [e.id, e.name]));

    const ownerIds = [
      ...new Set(
        avaliados
          .filter((p) => p.primaryOwnerId)
          .map((p) => p.primaryOwnerId as string),
      ),
    ];

    const byOwner = ownerIds.map((ownerId) => {
      const doOwner = avaliados.filter((p) => p.primaryOwnerId === ownerId);
      const agregado = assessPortfolio(
        doOwner.map((p) => ({ active: true, cc: p.cc, co: p.co })),
      );
      const byClass: Record<string, number> = {};
      CC_CO_CLASSES.forEach((cls) => {
        byClass[cls] = doOwner.filter((p) => p.ccClass === cls).length;
      });
      return {
        ownerId,
        ownerName: employeeNameById.get(ownerId) || 'Desconhecido',
        total: doOwner.length,
        byClass,
        cc: agregado.cc,
        co: agregado.co,
        // Distancia em relacao a media da area: positivo significa carteira
        // mais pesada, ou operacao menos madura, que a media do escritorio.
        ccDistance:
          agregado.cc != null && carteira.cc != null
            ? round2(agregado.cc - carteira.cc)
            : null,
        coDistance:
          agregado.co != null && carteira.co != null
            ? round2(agregado.co - carteira.co)
            : null,
      };
    });

    return {
      coverage: {
        totalClients: portfolio.length,
        activeClients: activePortfolio.length,
        assessedClients: avaliados.length,
        coveragePercent:
          activePortfolio.length > 0
            ? round2((avaliados.length / activePortfolio.length) * 100)
            : null,
      },
      statusData,
      taxRegimes: formatMap(regimesMap),
      segments: formatMap(segmentsMap),
      ccCurve: curva('ccClass'),
      coCurve: curva('coClass'),
      inactiveCount: portfolio.length - activePortfolio.length,
      pendingCount: activePortfolio.length - avaliados.length,
      cc: carteira.cc,
      co: carteira.co,
      pair: carteira.pair,
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
