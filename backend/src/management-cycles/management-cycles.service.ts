import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaClientManager } from '../prisma/prisma-client-manager';

// Classes válidas da curva de complexidade. C0 fica de fora: significa "não
// atua nesta frente", não é um degrau da curva (mesma regra do Diagnóstico em
// dashboard.service.ts).
const COMPLEXITY_CLASSES = ['C1', 'C2', 'C3', 'C4', 'C5'];

// Estados em que a avaliação ainda não fechou — contam como pendência, nunca
// como C1. IMPORTED e AI_SUGGESTED entram aqui porque nenhum humano revisou.
const PENDING_STATES = [
  'NOT_ASSESSED',
  'PARTIAL',
  'IMPORTED',
  'AI_SUGGESTED',
];

// Campos da avaliação de complexidade que o snapshot congela junto com o
// retrato comercial do cliente. Sem isso o ClientCycleSnapshot nasce com
// complexityClass = null e o Diagnóstico enxerga a carteira inteira como não
// avaliada, mesmo com o motor tendo calculado tudo (ORDEM-02, Bloco B).
function freezeAssessment(source: any) {
  if (!source) return {};
  return {
    scoreVolume: source.scoreVolume ?? null,
    scoreService: source.scoreService ?? null,
    scoreTax: source.scoreTax ?? null,
    scoreOrganization: source.scoreOrganization ?? null,
    scoreTurnover: source.scoreTurnover ?? null,
    rawSum: source.rawSum ?? null,
    normalizedScore: source.normalizedScore ?? null,
    complexityClass: source.complexityClass ?? null,
    assessmentState: source.assessmentState ?? 'NOT_ASSESSED',

    // Motor CC/CO. Congelar estes campos é o que permite comparar ciclos: a
    // queda da Maturidade ao longo dos meses é a evidência de que a operação
    // amadureceu, e sem o retrato do mês anterior não há o que comparar.
    profileType: source.client?.profileType ?? null,
    catalogAnswers: source.catalogAnswers ?? undefined,
    ccScore: source.ccScore ?? null,
    coScore: source.coScore ?? null,
    ccClass: source.ccClass ?? null,
    coClass: source.coClass ?? null,
    ccState: source.ccState ?? null,
    coState: source.coState ?? null,
  };
}

@Injectable()
export class ManagementCyclesService {
  constructor(private readonly prismaManager: PrismaClientManager) {}

  private getTenantPrisma(tenantId: string) {
    if (!tenantId)
      throw new NotFoundException('ID do escritório não informado.');
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  // Snapshots criados antes do Bloco B não têm complexityClass gravado. Para
  // não exibir a carteira histórica inteira como "não avaliada", caímos na
  // classificação viva quando o congelado estiver vazio — mesma precedência
  // do Diagnóstico (snapshot > classificação).
  private async buildLiveAssessmentMap(
    tenantPrisma: any,
    snapshots: { clientId: string; frontId: string | null }[],
  ): Promise<Map<string, any>> {
    const pending = snapshots.filter((s) => s.frontId);
    if (pending.length === 0) return new Map();

    const classifications =
      await tenantPrisma.clientFrontClassification.findMany({
        where: {
          clientId: { in: [...new Set(pending.map((s) => s.clientId))] },
          frontId: { in: [...new Set(pending.map((s) => s.frontId as string))] },
        },
      });

    return new Map(
      classifications.map((c: any) => [`${c.clientId}|${c.frontId}`, c]),
    );
  }

  // Resolve a avaliação efetiva de um snapshot: o congelado tem precedência;
  // o vivo só entra quando o congelado nunca foi preenchido.
  private resolveAssessment(snap: any, liveMap: Map<string, any>) {
    const live = liveMap.get(`${snap.clientId}|${snap.frontId}`);

    // Índices CC/CO (ORDEM-02). Congelado tem precedência; o vivo cobre o
    // registro que ainda não foi congelado no ciclo.
    const ccScore = snap.ccScore ?? live?.ccScore ?? null;
    const coScore = snap.coScore ?? live?.coScore ?? null;
    const novo = {
      ccScore,
      coScore,
      ccClass: snap.ccClass ?? live?.ccClass ?? null,
      coClass: snap.coClass ?? live?.coClass ?? null,
      ccState: snap.ccState ?? live?.ccState ?? null,
      coState: snap.coState ?? live?.coState ?? null,
    };

    // LEGADO: campos do motor antigo (escala 1..3 normalizada 0..100).
    // Continuam no payload enquanto telas não migradas os consomem.
    if (snap.complexityClass) {
      return {
        ...novo,
        complexityClass: snap.complexityClass,
        assessmentState: snap.assessmentState ?? 'NOT_ASSESSED',
        normalizedScore: snap.normalizedScore ?? null,
      };
    }
    return {
      ...novo,
      complexityClass: live?.complexityClass ?? null,
      assessmentState:
        live?.assessmentState ?? snap.assessmentState ?? 'NOT_ASSESSED',
      normalizedScore: live?.normalizedScore ?? null,
    };
  }

  async findAll(tenantId: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    return tenantPrisma.managementCycle.findMany({
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });
  }

  async findOne(tenantId: string, cycleId: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    const cycle = await tenantPrisma.managementCycle.findUnique({
      where: { id: cycleId },
    });
    if (!cycle) throw new NotFoundException('Ciclo não encontrado.');
    return cycle;
  }

  async allocateClientToCycle(
    tenantId: string,
    cycleId: string,
    data: { clientId: string; frontId: string; subdivisionId?: string },
  ) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    // Get client details to inherit
    const client = await tenantPrisma.client.findUnique({
      where: { id: data.clientId },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado.');

    const frontClassification =
      await tenantPrisma.clientFrontClassification.findUnique({
        where: {
          clientId_frontId: { clientId: data.clientId, frontId: data.frontId },
        },
      });

    const existing = await tenantPrisma.clientCycleSnapshot.findUnique({
      where: {
        cycleId_clientId_frontId: {
          cycleId,
          clientId: data.clientId,
          frontId: data.frontId,
        },
      },
    });

    if (existing)
      throw new ConflictException(
        'Este cliente já está alocado nesta frente para este ciclo.',
      );

    return tenantPrisma.clientCycleSnapshot.create({
      data: {
        cycleId,
        clientId: data.clientId,
        frontId: data.frontId,
        subdivisionId: data.subdivisionId || null,
        taxRegime: client.taxRegime,
        segment: client.segment,
        monthlyFee: client.monthlyFee,
        classification: client.classification,
        complexity: frontClassification?.complexity || null,
        frequency: frontClassification?.frequency || null,
        particulars: frontClassification?.particulars || null,
        primaryOwnerId: frontClassification?.operator1Id || null,
        secondaryOwnerId: frontClassification?.operator2Id || null,
        ...freezeAssessment(frontClassification),
      },
    });
  }

  async removeClientFromCycleFront(
    tenantId: string,
    cycleId: string,
    snapshotId: string,
  ) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    const snapshot = await tenantPrisma.clientCycleSnapshot.findUnique({
      where: { id: snapshotId },
    });

    if (!snapshot || snapshot.cycleId !== cycleId) {
      throw new NotFoundException(
        'Alocação do cliente no ciclo não encontrada.',
      );
    }

    // Usamos transação para garantir que excluímos do ciclo e desativamos globalmente
    return tenantPrisma.$transaction(async (tx) => {
      // 1. Exclui o snapshot do ciclo
      await tx.clientCycleSnapshot.delete({
        where: { id: snapshotId },
      });

      // 2. Desativa a frente globalmente — snapshot "sem frente" (cliente
      // importado sem nenhuma linha de frente correspondente) não tem
      // classificação nenhuma pra desativar aqui.
      if (snapshot.frontId) {
        const classification = await tx.clientFrontClassification.findUnique({
          where: {
            clientId_frontId: {
              clientId: snapshot.clientId,
              frontId: snapshot.frontId,
            },
          },
        });

        if (classification) {
          await tx.clientFrontClassification.update({
            where: { id: classification.id },
            data: { actsInFront: 'NO' },
          });
        }
      }

      return { success: true };
    });
  }

  async updateClientCycleSnapshot(
    tenantId: string,
    cycleId: string,
    snapshotId: string,
    data: any,
  ) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    return tenantPrisma.clientCycleSnapshot.update({
      where: { id: snapshotId },
      data: {
        complexity: data.complexity ? Number(data.complexity) : null,
        frequency: data.frequency || null,
        particulars: data.particulars || null,
      },
    });
  }

  async removeTeamFromCycleFront(
    tenantId: string,
    cycleId: string,
    allocationId: string,
  ) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    const allocation = await tenantPrisma.employeeCycleAllocation.findUnique({
      where: { id: allocationId },
    });

    if (!allocation || allocation.cycleId !== cycleId) {
      throw new NotFoundException(
        'Alocação da equipe no ciclo não encontrada.',
      );
    }

    return tenantPrisma.employeeCycleAllocation.delete({
      where: { id: allocationId },
    });
  }

  async updateCycle(
    tenantId: string,
    cycleId: string,
    data: { goal?: string; status?: string },
  ) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    return tenantPrisma.managementCycle.update({
      where: { id: cycleId },
      data,
    });
  }

  async createCycle(tenantId: string, data: { month: number; year: number }) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    const existing = await tenantPrisma.managementCycle.findUnique({
      where: { month_year: { month: data.month, year: data.year } },
    });
    if (existing)
      throw new ConflictException('Ciclo já existe para este mês/ano.');

    const newCycle = await tenantPrisma.managementCycle.create({
      data: {
        month: data.month,
        year: data.year,
        status: 'OPEN',
      },
    });

    // Tenta encontrar o ciclo anterior para clonar
    const lastCycle = await tenantPrisma.managementCycle.findFirst({
      where: {
        NOT: { id: newCycle.id },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    if (lastCycle) {
      // Clonar configurações de clientes (ClientCycleSnapshot)
      const lastClientSnapshots =
        await tenantPrisma.clientCycleSnapshot.findMany({
          where: { cycleId: lastCycle.id },
        });

      if (lastClientSnapshots.length > 0) {
        const snapshotsData = lastClientSnapshots.map((snap: any) => ({
          cycleId: newCycle.id,
          clientId: snap.clientId,
          frontId: snap.frontId,
          subdivisionId: snap.subdivisionId,
          taxRegime: snap.taxRegime,
          segment: snap.segment,
          monthlyFee: snap.monthlyFee,
          classification: snap.classification,
          complexity: snap.complexity,
          frequency: snap.frequency,
          particulars: snap.particulars,
          primaryOwnerId: snap.primaryOwnerId,
          secondaryOwnerId: snap.secondaryOwnerId,
          ...freezeAssessment(snap),
        }));
        await tenantPrisma.clientCycleSnapshot.createMany({
          data: snapshotsData,
        });
      }

      // Clonar alocações de equipe (EmployeeCycleAllocation)
      const lastEmployeeAllocations =
        await tenantPrisma.employeeCycleAllocation.findMany({
          where: { cycleId: lastCycle.id },
        });

      if (lastEmployeeAllocations.length > 0) {
        const allocationsData = lastEmployeeAllocations.map((alloc: any) => ({
          cycleId: newCycle.id,
          employeeId: alloc.employeeId,
          frontId: alloc.frontId,
          subdivisionId: alloc.subdivisionId,
          leaderId: alloc.leaderId,
          dailyAvailableTime: alloc.dailyAvailableTime,
          predictableRecurrentTimePercentage:
            alloc.predictableRecurrentTimePercentage,
          unpredictableRecurrentTimePercentage:
            alloc.unpredictableRecurrentTimePercentage,
          allocationStartDate: alloc.allocationStartDate,
          allocationEndDate: alloc.allocationEndDate,
          status: alloc.status,
        }));
        await tenantPrisma.employeeCycleAllocation.createMany({
          data: allocationsData,
        });
      }
    } else {
      // Caso não exista ciclo anterior (primeiro ciclo), usa a lógica global existente
      // Rollover: Clients global setup
      const activeClients = await tenantPrisma.client.findMany({
        where: { status: 'ACTIVE' },
        include: { frontClassifications: true },
      });

      if (activeClients.length > 0) {
        const snapshotsData: any[] = [];

        for (const client of activeClients) {
          if (
            !client.frontClassifications ||
            client.frontClassifications.length === 0
          )
            continue;

          for (const frontClass of client.frontClassifications) {
            if (frontClass.actsInFront === 'YES') {
              snapshotsData.push({
                cycleId: newCycle.id,
                clientId: client.id,
                frontId: frontClass.frontId,
                subdivisionId: frontClass.subdivisionId || null,

                taxRegime: client.taxRegime,
                segment: client.segment,
                monthlyFee: client.monthlyFee,
                classification: client.classification,
                complexity: frontClass.complexity,
                frequency: frontClass.frequency,
                particulars: frontClass.particulars,
                primaryOwnerId: frontClass.operator1Id || null,
                secondaryOwnerId: frontClass.operator2Id || null,
                ...freezeAssessment(frontClass),
              });
            }
          }
        }

        if (snapshotsData.length > 0) {
          await tenantPrisma.clientCycleSnapshot.createMany({
            data: snapshotsData,
          });
        }
      }
    }

    return newCycle;
  }

  async getCycleClients(
    tenantId: string,
    cycleId: string,
    frontId?: string,
    subdivisionId?: string,
    clientId?: string,
  ) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    // Fetch snapshots with the included client data
    const whereClause: any = { cycleId };
    if (frontId) whereClause.frontId = frontId;
    if (subdivisionId) whereClause.subdivisionId = subdivisionId;
    if (clientId) whereClause.clientId = clientId;

    const snapshots = await tenantPrisma.clientCycleSnapshot.findMany({
      where: whereClause,
      include: { client: true, front: true },
    });

    const liveMap = await this.buildLiveAssessmentMap(tenantPrisma, snapshots);

    return snapshots.map((snap: any) => ({
      ...snap.client,
      snapshotId: snap.id,
      taxRegime: snap.taxRegime,
      segment: snap.segment,
      monthlyFee: snap.monthlyFee,
      classification: snap.classification,
      // LEGADO: mantido no payload só para não quebrar consumidor antigo.
      // A tela usa complexityClass/assessmentState (ORDEM-02, Bloco B).
      complexity: snap.complexity,
      ...this.resolveAssessment(snap, liveMap),
      frequency: snap.frequency,
      particulars: snap.particulars,
      frontId: snap.frontId,
      subdivisionId: snap.subdivisionId,
      frontName: snap.front?.name,
    }));
  }

  async getCycleTeam(
    tenantId: string,
    cycleId: string,
    frontId?: string,
    subdivisionId?: string,
    employeeId?: string,
  ) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    const whereClause: any = { cycleId };
    if (frontId) whereClause.frontId = frontId;
    if (subdivisionId) whereClause.subdivisionId = subdivisionId;
    if (employeeId) whereClause.employeeId = employeeId;

    const allocations = await tenantPrisma.employeeCycleAllocation.findMany({
      where: whereClause,
      include: { employee: true, front: true },
    });

    // Quantos clientes distintos dependem de cada colaborador como líder ou
    // operador em alguma frente — usado pra avisar antes de desativar/
    // excluir alguém que ainda está segurando carteira (mesmas 3 colunas
    // checadas em employees.service.ts remove()).
    const employeeIds = [...new Set(allocations.map((a) => a.employeeId))];
    const classifications = employeeIds.length
      ? await tenantPrisma.clientFrontClassification.findMany({
          where: {
            OR: [
              { leaderId: { in: employeeIds } },
              { operator1Id: { in: employeeIds } },
              { operator2Id: { in: employeeIds } },
            ],
          },
          select: {
            clientId: true,
            leaderId: true,
            operator1Id: true,
            operator2Id: true,
          },
        })
      : [];

    const clientsByEmployee = new Map<string, Set<string>>();
    const link = (empId: string | null, clientId: string) => {
      if (!empId) return;
      if (!clientsByEmployee.has(empId))
        clientsByEmployee.set(empId, new Set());
      clientsByEmployee.get(empId)!.add(clientId);
    };
    classifications.forEach((c) => {
      link(c.leaderId, c.clientId);
      link(c.operator1Id, c.clientId);
      link(c.operator2Id, c.clientId);
    });

    return allocations.map((alloc: any) => ({
      id: alloc.id,
      employeeId: alloc.employeeId,
      frontId: alloc.frontId,
      subdivisionId: alloc.subdivisionId,
      leaderId: alloc.leaderId,
      allocatedHours: alloc.dailyAvailableTime || 0,
      status: alloc.status,
      employee: alloc.employee
        ? {
            ...alloc.employee,
            linkedClientsCount:
              clientsByEmployee.get(alloc.employeeId)?.size || 0,
          }
        : alloc.employee,
      frontName: alloc.front?.name,
    }));
  }

  async getDashboardStats(
    tenantId: string,
    cycleId: string,
    frontId?: string,
    subdivisionId?: string,
  ) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    const cycle = await tenantPrisma.managementCycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) throw new NotFoundException('Ciclo não encontrado');

    const competence = `${cycle.month.toString().padStart(2, '0')}/${cycle.year}`;

    const whereClause: any = { cycleId };
    if (frontId) whereClause.frontId = frontId;
    if (subdivisionId) whereClause.subdivisionId = subdivisionId;

    const snapshots = await tenantPrisma.clientCycleSnapshot.findMany({
      where: whereClause,
    });

    let uniqueClientsTotalRevenue = 0;
    const clientIdsCounted = new Set<string>();

    const distributionByTaxRegime: Record<string, number> = {};
    const distributionByComplexity: Record<string, number> = {};
    const distributionByFrequency: Record<string, number> = {};
    const clientIdsForRegime = new Set<string>();

    // B3: a curva passa a ser a classe calculada (C1..C5). C0 e pendentes
    // saem para contadores próprios — somá-los a C1 é o que fazia carteira
    // não mapeada parecer mapeada.
    const liveMap = await this.buildLiveAssessmentMap(tenantPrisma, snapshots);
    let complexityC0Count = 0;
    let complexityPendingCount = 0;
    const coDistribution: Record<string, number> = {};
    for (const cls of COMPLEXITY_CLASSES) {
      distributionByComplexity[cls] = 0;
      coDistribution[cls] = 0;
    }

    for (const snap of snapshots) {
      if (!clientIdsCounted.has(snap.clientId)) {
        uniqueClientsTotalRevenue += Number(snap.monthlyFee) || 0;
        clientIdsCounted.add(snap.clientId);
      }

      if (!clientIdsForRegime.has(snap.clientId)) {
        const regime = snap.taxRegime || 'Não Informado';
        distributionByTaxRegime[regime] =
          (distributionByTaxRegime[regime] || 0) + 1;
        clientIdsForRegime.add(snap.clientId);
      }

      // Motor CC/CO: dois indices por frente. Frente inativa nao entra em
      // media nenhuma, e avaliacao incompleta conta como pendencia em vez de
      // ser somada a classe mais simples.
      const assessment = this.resolveAssessment(snap, liveMap);
      if (assessment.ccState === 'INACTIVE') {
        complexityC0Count += 1;
      } else if (assessment.ccClass && assessment.coClass) {
        distributionByComplexity[assessment.ccClass] =
          (distributionByComplexity[assessment.ccClass] || 0) + 1;
        coDistribution[assessment.coClass] =
          (coDistribution[assessment.coClass] || 0) + 1;
      } else {
        complexityPendingCount += 1;
      }

      if (snap.frequency) {
        const freq = snap.frequency;
        distributionByFrequency[freq] =
          (distributionByFrequency[freq] || 0) + 1;
      }
    }

    const allocations = await tenantPrisma.employeeCycleAllocation.findMany({
      where: whereClause,
      include: { employee: true },
    });

    let uniqueEmployeesTotalCost = 0;
    const employeeIdsCounted = new Set<string>();

    for (const alloc of allocations) {
      if (!employeeIdsCounted.has(alloc.employeeId)) {
        uniqueEmployeesTotalCost += Number(alloc.employee.grossSalary) || 0;
        employeeIdsCounted.add(alloc.employeeId);
      }
    }

    // Get delivery stats
    const deliveriesWhere: any = { competence };
    if (frontId) deliveriesWhere.frontId = frontId;
    if (subdivisionId) deliveriesWhere.subdivisionId = subdivisionId;

    const allTasks = await tenantPrisma.delivery.findMany({
      where: deliveriesWhere,
      select: { completedAt: true, estimatedTimeMinutes: true },
    });

    const totalTasks = allTasks.length;
    // "Concluída" deixou de ser um valor de status pra virar completedAt !=
    // null — o próprio sinal que STATUS OBRIGAÇÃO/AGENDA usam pra decidir
    // "Realizada" (ver delivery-status.rules.ts).
    const completedTasks = allTasks.filter((t) => t.completedAt != null).length;

    let totalEstimatedMinutes = 0;
    let completedEstimatedMinutes = 0;

    for (const t of allTasks) {
      const mins = t.estimatedTimeMinutes || 30; // fallback to 30 mins
      totalEstimatedMinutes += mins;
      if (t.completedAt != null) {
        completedEstimatedMinutes += mins;
      }
    }

    return {
      cycleId,
      goal: cycle.goal,
      totalRevenue: uniqueClientsTotalRevenue,
      totalPersonnelCost: uniqueEmployeesTotalCost,
      kpiPersonnelCostPercent:
        uniqueClientsTotalRevenue > 0
          ? (uniqueEmployeesTotalCost / uniqueClientsTotalRevenue) * 100
          : 0,
      clientsCount: clientIdsCounted.size,
      teamCount: employeeIdsCounted.size,
      distributionByTaxRegime,
      // distributionByComplexity guarda a Natureza do Cliente; coDistribution,
      // a Maturidade da Operacao. O nome antigo fica para nao quebrar consumidor.
      distributionByComplexity,
      coDistribution,
      complexityC0Count,
      complexityPendingCount,
      distributionByFrequency,
      totalTasks,
      completedTasks,
      totalEstimatedMinutes,
      completedEstimatedMinutes,
    };
  }

  async deleteCycle(tenantId: string, cycleId: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    const cycle = await tenantPrisma.managementCycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) throw new NotFoundException('Ciclo não encontrado.');

    await tenantPrisma.managementCycle.delete({
      where: { id: cycleId },
    });

    return { success: true };
  }
}
