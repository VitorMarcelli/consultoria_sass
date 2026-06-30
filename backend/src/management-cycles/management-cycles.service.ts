import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaClientManager } from '../prisma/prisma-client-manager';

@Injectable()
export class ManagementCyclesService {
  constructor(private readonly prismaManager: PrismaClientManager) {}

  private getTenantPrisma(tenantId: string) {
    if (!tenantId) throw new NotFoundException('ID do escritório não informado.');
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  async findAll(tenantId: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    return tenantPrisma.managementCycle.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async findOne(tenantId: string, cycleId: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    const cycle = await tenantPrisma.managementCycle.findUnique({
      where: { id: cycleId }
    });
    if (!cycle) throw new NotFoundException('Ciclo não encontrado.');
    return cycle;
  }

  async allocateClientToCycle(tenantId: string, cycleId: string, data: { clientId: string, frontId: string, subdivisionId?: string }) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    // Get client details to inherit
    const client = await tenantPrisma.client.findUnique({
      where: { id: data.clientId }
    });
    if (!client) throw new NotFoundException('Cliente não encontrado.');

    const frontClassification = await tenantPrisma.clientFrontClassification.findUnique({
      where: { clientId_frontId: { clientId: data.clientId, frontId: data.frontId } }
    });

    const existing = await tenantPrisma.clientCycleSnapshot.findUnique({
      where: { cycleId_clientId_frontId: { cycleId, clientId: data.clientId, frontId: data.frontId } }
    });

    if (existing) throw new ConflictException('Este cliente já está alocado nesta frente para este ciclo.');

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
      }
    });
  }

  async removeClientFromCycleFront(tenantId: string, cycleId: string, snapshotId: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    const snapshot = await tenantPrisma.clientCycleSnapshot.findUnique({
      where: { id: snapshotId }
    });

    if (!snapshot || snapshot.cycleId !== cycleId) {
      throw new NotFoundException('Alocação do cliente no ciclo não encontrada.');
    }

    // Usamos transação para garantir que excluímos do ciclo e desativamos globalmente
    return tenantPrisma.$transaction(async (tx) => {
      // 1. Exclui o snapshot do ciclo
      await tx.clientCycleSnapshot.delete({
        where: { id: snapshotId }
      });

      // 2. Desativa a frente globalmente
      const classification = await tx.clientFrontClassification.findUnique({
        where: { clientId_frontId: { clientId: snapshot.clientId, frontId: snapshot.frontId } }
      });

      if (classification) {
        await tx.clientFrontClassification.update({
          where: { id: classification.id },
          data: { actsInFront: 'NO' }
        });
      }

      return { success: true };
    });
  }

  async updateClientCycleSnapshot(tenantId: string, cycleId: string, snapshotId: string, data: any) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    
    return tenantPrisma.clientCycleSnapshot.update({
      where: { id: snapshotId },
      data: {
        complexity: data.complexity ? Number(data.complexity) : null,
        frequency: data.frequency || null,
        particulars: data.particulars || null
      }
    });
  }

  async removeTeamFromCycleFront(tenantId: string, cycleId: string, allocationId: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    const allocation = await tenantPrisma.employeeCycleAllocation.findUnique({
      where: { id: allocationId }
    });

    if (!allocation || allocation.cycleId !== cycleId) {
      throw new NotFoundException('Alocação da equipe no ciclo não encontrada.');
    }

    return tenantPrisma.employeeCycleAllocation.delete({
      where: { id: allocationId }
    });
  }

  async createCycle(tenantId: string, data: { month: number, year: number }) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    const existing = await tenantPrisma.managementCycle.findUnique({
      where: { month_year: { month: data.month, year: data.year } }
    });
    if (existing) throw new ConflictException('Ciclo já existe para este mês/ano.');

    const newCycle = await tenantPrisma.managementCycle.create({
      data: {
        month: data.month,
        year: data.year,
        status: 'OPEN'
      }
    });

    // Tenta encontrar o ciclo anterior para clonar
    const lastCycle = await tenantPrisma.managementCycle.findFirst({
      where: {
        NOT: { id: newCycle.id }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });

    if (lastCycle) {
      // Clonar configurações de clientes (ClientCycleSnapshot)
      const lastClientSnapshots = await tenantPrisma.clientCycleSnapshot.findMany({
        where: { cycleId: lastCycle.id }
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
          particulars: snap.particulars
        }));
        await tenantPrisma.clientCycleSnapshot.createMany({ data: snapshotsData });
      }

      // Clonar alocações de equipe (EmployeeCycleAllocation)
      const lastEmployeeAllocations = await tenantPrisma.employeeCycleAllocation.findMany({
        where: { cycleId: lastCycle.id }
      });

      if (lastEmployeeAllocations.length > 0) {
        const allocationsData = lastEmployeeAllocations.map((alloc: any) => ({
          cycleId: newCycle.id,
          employeeId: alloc.employeeId,
          frontId: alloc.frontId,
          subdivisionId: alloc.subdivisionId,
          leaderId: alloc.leaderId,
          dailyAvailableTime: alloc.dailyAvailableTime,
          predictableRecurrentTimePercentage: alloc.predictableRecurrentTimePercentage,
          unpredictableRecurrentTimePercentage: alloc.unpredictableRecurrentTimePercentage,
          allocationStartDate: alloc.allocationStartDate,
          allocationEndDate: alloc.allocationEndDate,
          status: alloc.status
        }));
        await tenantPrisma.employeeCycleAllocation.createMany({ data: allocationsData });
      }
    } else {
      // Caso não exista ciclo anterior (primeiro ciclo), usa a lógica global existente
      // Rollover: Clients global setup
      const activeClients = await tenantPrisma.client.findMany({
        where: { status: 'ACTIVE' },
        include: { frontClassifications: true }
      });

      if (activeClients.length > 0) {
        const snapshotsData: any[] = [];
        
        for (const client of activeClients) {
          if (!client.frontClassifications || client.frontClassifications.length === 0) continue;

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
                particulars: frontClass.particulars
              });
            }
          }
        }

        if (snapshotsData.length > 0) {
          await tenantPrisma.clientCycleSnapshot.createMany({
            data: snapshotsData
          });
        }
      }
    }

    return newCycle;
  }

  async getCycleClients(tenantId: string, cycleId: string, frontId?: string, subdivisionId?: string, clientId?: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    
    // Fetch snapshots with the included client data
    const whereClause: any = { cycleId };
    if (frontId) whereClause.frontId = frontId;
    if (subdivisionId) whereClause.subdivisionId = subdivisionId;
    if (clientId) whereClause.clientId = clientId;

    const snapshots = await tenantPrisma.clientCycleSnapshot.findMany({
      where: whereClause,
      include: { client: true, front: true }
    });

    return snapshots.map((snap: any) => ({
      ...snap.client,
      snapshotId: snap.id,
      taxRegime: snap.taxRegime,
      segment: snap.segment,
      monthlyFee: snap.monthlyFee,
      classification: snap.classification,
      complexity: snap.complexity,
      frequency: snap.frequency,
      particulars: snap.particulars,
      frontId: snap.frontId,
      subdivisionId: snap.subdivisionId,
      frontName: snap.front?.name
    }));
  }

  async getCycleTeam(tenantId: string, cycleId: string, frontId?: string, subdivisionId?: string, employeeId?: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    
    const whereClause: any = { cycleId };
    if (frontId) whereClause.frontId = frontId;
    if (subdivisionId) whereClause.subdivisionId = subdivisionId;
    if (employeeId) whereClause.employeeId = employeeId;

    const allocations = await tenantPrisma.employeeCycleAllocation.findMany({
      where: whereClause,
      include: { employee: true, front: true }
    });

    return allocations.map((alloc: any) => ({
      id: alloc.id,
      employeeId: alloc.employeeId,
      frontId: alloc.frontId,
      subdivisionId: alloc.subdivisionId,
      leaderId: alloc.leaderId,
      allocatedHours: alloc.dailyAvailableTime || 0,
      status: alloc.status,
      employee: alloc.employee,
      frontName: alloc.front?.name
    }));
  }

  async getDashboardStats(tenantId: string, cycleId: string, frontId?: string, subdivisionId?: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    const whereClause: any = { cycleId };
    if (frontId) whereClause.frontId = frontId;
    if (subdivisionId) whereClause.subdivisionId = subdivisionId;

    const snapshots = await tenantPrisma.clientCycleSnapshot.findMany({
      where: whereClause
    });
    
    let uniqueClientsTotalRevenue = 0;
    const clientIdsCounted = new Set<string>();
    
    const distributionByTaxRegime: Record<string, number> = {};
    const distributionByComplexity: Record<string, number> = {};
    const distributionByFrequency: Record<string, number> = {};
    const clientIdsForRegime = new Set<string>();

    for (const snap of snapshots) {
      if (!clientIdsCounted.has(snap.clientId)) {
        uniqueClientsTotalRevenue += (Number(snap.monthlyFee) || 0);
        clientIdsCounted.add(snap.clientId);
      }

      if (!clientIdsForRegime.has(snap.clientId)) {
        const regime = snap.taxRegime || 'Não Informado';
        distributionByTaxRegime[regime] = (distributionByTaxRegime[regime] || 0) + 1;
        clientIdsForRegime.add(snap.clientId);
      }

      if (snap.complexity !== null && snap.complexity !== undefined) {
        const comp = `Nível ${snap.complexity}`;
        distributionByComplexity[comp] = (distributionByComplexity[comp] || 0) + 1;
      }

      if (snap.frequency) {
        const freq = snap.frequency;
        distributionByFrequency[freq] = (distributionByFrequency[freq] || 0) + 1;
      }
    }

    const allocations = await tenantPrisma.employeeCycleAllocation.findMany({
      where: whereClause,
      include: { employee: true }
    });

    let uniqueEmployeesTotalCost = 0;
    const employeeIdsCounted = new Set<string>();

    for (const alloc of allocations) {
      if (!employeeIdsCounted.has(alloc.employeeId)) {
        uniqueEmployeesTotalCost += (Number(alloc.employee.grossSalary) || 0);
        employeeIdsCounted.add(alloc.employeeId);
      }
    }

    return {
      cycleId,
      totalRevenue: uniqueClientsTotalRevenue,
      totalPersonnelCost: uniqueEmployeesTotalCost,
      kpiPersonnelCostPercent: uniqueClientsTotalRevenue > 0 ? (uniqueEmployeesTotalCost / uniqueClientsTotalRevenue) * 100 : 0,
      clientsCount: clientIdsCounted.size,
      teamCount: employeeIdsCounted.size,
      distributionByTaxRegime,
      distributionByComplexity,
      distributionByFrequency
    };
  }

  async deleteCycle(tenantId: string, cycleId: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    
    const cycle = await tenantPrisma.managementCycle.findUnique({
      where: { id: cycleId }
    });
    
    if (!cycle) throw new NotFoundException('Ciclo não encontrado.');

    await tenantPrisma.managementCycle.delete({
      where: { id: cycleId }
    });

    return { success: true };
  }
}
