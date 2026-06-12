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

    // Rollover: Clients
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

    return newCycle;
  }

  async getCycleClients(tenantId: string, cycleId: string, frontId?: string, subdivisionId?: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    
    // Fetch snapshots with the included client data
    const whereClause: any = { cycleId };
    if (frontId) whereClause.frontId = frontId;
    if (subdivisionId) whereClause.subdivisionId = subdivisionId;

    const snapshots = await tenantPrisma.clientCycleSnapshot.findMany({
      where: whereClause,
      include: { client: true }
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
      subdivisionId: snap.subdivisionId
    }));
  }

  async getCycleTeam(tenantId: string, cycleId: string, frontId?: string, subdivisionId?: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    
    const whereClause: any = { cycleId };
    if (frontId) whereClause.frontId = frontId;
    if (subdivisionId) whereClause.subdivisionId = subdivisionId;

    const allocations = await tenantPrisma.employeeCycleAllocation.findMany({
      where: whereClause,
      include: { employee: true }
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
    
    // Na vida real, a receita seria do cliente vs front, mas aqui simplificamos sumindo os monthlyFee
    // Se o cliente tem 1000 de fee global, talvez devesse ser particionado, 
    // mas vamos manter o sum para seguir com a ideia geral.
    // Dica: Cuidado ao somar monthlyFee se o mesmo cliente estiver em 2 fronts. Para evitar duplicidade global:
    
    let uniqueClientsTotalRevenue = 0;
    const clientIdsCounted = new Set<string>();

    for (const snap of snapshots) {
      if (!clientIdsCounted.has(snap.clientId)) {
        uniqueClientsTotalRevenue += (Number(snap.monthlyFee) || 0);
        clientIdsCounted.add(snap.clientId);
      }
    }

    // 2. Custo Total da Equipe Alocada
    // Fetch from EmployeeCycleAllocation
    const allocations = await tenantPrisma.employeeCycleAllocation.findMany({
      where: whereClause,
      include: { employee: true }
    });

    let uniqueEmployeesTotalCost = 0;
    const employeeIdsCounted = new Set<string>();

    for (const alloc of allocations) {
      if (!employeeIdsCounted.has(alloc.employeeId)) {
        // Here we could calculate proportion based on dailyAvailableTime
        uniqueEmployeesTotalCost += (Number(alloc.employee.grossSalary) || 0);
        employeeIdsCounted.add(alloc.employeeId);
      }
    }

    const distributionByTaxRegime = snapshots.reduce((acc: any, curr: any) => {
      // Only count each client once for distribution
      if (curr.taxRegime) {
         // This is a naive count, if client is multiple times, it will be counted multiple times
         const regime = curr.taxRegime || 'OUTROS';
         acc[regime] = (acc[regime] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      cycleId,
      totalRevenue: uniqueClientsTotalRevenue,
      totalPersonnelCost: uniqueEmployeesTotalCost,
      kpiPersonnelCostPercent: uniqueClientsTotalRevenue > 0 ? (uniqueEmployeesTotalCost / uniqueClientsTotalRevenue) * 100 : 0,
      distributionByTaxRegime
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
