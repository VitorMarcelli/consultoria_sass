import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientManager } from '../prisma/prisma-client-manager';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prismaManager: PrismaClientManager,
  ) {}

  private getTenantPrisma(tenantId: string) {
    if (!tenantId) throw new NotFoundException('ID do escritório não informado.');
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  private async getCompetenceFromCycle(tenantId: string, cycleId: string): Promise<string> {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    const cycle = await tenantPrisma.managementCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) throw new Error('Cycle not found');
    const monthStr = cycle.month.toString().padStart(2, '0');
    return `${monthStr}/${cycle.year}`;
  }

  async getCycleMapping(tenantId: string, cycleId: string, frontId: string) {
    const competence = await this.getCompetenceFromCycle(tenantId, cycleId);
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    
    // Busca entregas deste ciclo e frente
    const deliveries = await tenantPrisma.delivery.findMany({
      where: { frontId, competence },
      include: {
        client: true,
        responsible: true,
      }
    });

    // Mapear clientes únicos ativos no ciclo
    const uniqueClientsMap = new Map<string, any>();
    deliveries.forEach(d => {
      if (!uniqueClientsMap.has(d.clientId)) {
        uniqueClientsMap.set(d.clientId, d.client);
      }
    });
    
    const cycleClients = Array.from(uniqueClientsMap.values());
    
    // 1. Status do Cliente
    const statusData = {
      ativos: cycleClients.filter(c => c.status === 'ACTIVE').length,
      inativos: cycleClients.filter(c => c.status !== 'ACTIVE').length,
      total: cycleClients.length
    };

    // Mapas para os gráficos
    const regimesMap = new Map<string, number>();
    const segmentsMap = new Map<string, number>();
    const operatorMap = new Map<string, Record<string, number>>(); 

    // Popula tributação e segmento com base nos clientes únicos
    cycleClients.forEach(c => {
      const regime = c.taxRegime || 'Não Informado';
      const segment = c.segment || 'Não Informado';
      
      regimesMap.set(regime, (regimesMap.get(regime) || 0) + 1);
      segmentsMap.set(segment, (segmentsMap.get(segment) || 0) + 1);
    });

    // Popula carga por responsável com base nas ENTREGAS do ciclo
    deliveries.forEach(d => {
      const opName = d.responsible?.name || 'Sem Responsável';
      if (!operatorMap.has(opName)) operatorMap.set(opName, { total: 0 });
      
      const opData = operatorMap.get(opName)!;
      // Usaremos prioridade como métrica de complexidade provisória
      const priorityLevel = d.priority === 'HIGH' ? '3' : d.priority === 'MEDIUM' ? '2' : '1';
      opData[priorityLevel] = (opData[priorityLevel] || 0) + 1;
      opData['total'] += 1;
    });

    const formatMap = (map: Map<string, any>) => Array.from(map.entries()).map(([name, value]) => ({ name, value }));

    return {
      statusData,
      taxRegimes: formatMap(regimesMap),
      segments: formatMap(segmentsMap),
      operatorComplexity: Array.from(operatorMap.entries()).map(([operator, counts]) => ({ operator, ...counts })),
    };
  }

  async getCapacityPlanning(tenantId: string, cycleId: string, frontId: string) {
    const competence = await this.getCompetenceFromCycle(tenantId, cycleId);
    const tenantPrisma = await this.getTenantPrisma(tenantId);

    const allocWhere = frontId === 'all' ? { cycleId, status: 'ACTIVE' } : { cycleId, frontId, status: 'ACTIVE' };
    const allocations = await tenantPrisma.employeeCycleAllocation.findMany({
      where: allocWhere,
      include: { employee: true }
    });

    const uniqueEmployees = new Map();
    allocations.forEach(a => uniqueEmployees.set(a.employeeId, a));
    const uniqueAllocations = Array.from(uniqueEmployees.values());

    // 2. Buscamos as entregas do ciclo
    const delWhere = frontId === 'all' ? { competence } : { frontId, competence };
    const deliveries = await tenantPrisma.delivery.findMany({
      where: delWhere,
      include: { responsible: true }
    });

    const timeByEmployee = new Map<string, number>(); // Tempo em minutos
    deliveries.forEach(d => {
      const empId = d.responsibleId;
      const time = d.estimatedTimeMinutes || 0;
      timeByEmployee.set(empId, (timeByEmployee.get(empId) || 0) + time);
    });

    const capacityData = uniqueAllocations.map(alloc => {
      const availableHours = (alloc.dailyAvailableTime || 8) * 21; // ex: 21 dias uteis no mes
      const estimatedMinutes = timeByEmployee.get(alloc.employeeId) || 0;
      const estimatedHours = Math.floor(estimatedMinutes / 60);

      return {
        employee: alloc.employee.name,
        available: availableHours,
        recurrent: estimatedHours, 
        extra: 0, 
        rework: 0 
      };
    });

    return {
      capacityData
    };
  }

  async getDailyLeveling(tenantId: string, cycleId: string, frontId: string) {
    const competence = await this.getCompetenceFromCycle(tenantId, cycleId);
    const tenantPrisma = await this.getTenantPrisma(tenantId);

    // Busca todas as entregas do ciclo/frente para montar o Gráfico Heijunka
    const deliveries = await tenantPrisma.delivery.findMany({
      where: { frontId, competence },
      include: {
        responsible: true,
        client: true
      }
    });

    // Agrupar por data de execução (executionDeadline)
    const dailyCount = new Map<string, number>();
    
    deliveries.forEach(d => {
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
      deliveriesList: deliveries // Manda a lista filtrada para o front-end
    };
  }

  async rescheduleBulkDeliveries(tenantId: string, deliveryIds: string[], newDateStr: string) {
    const newDate = new Date(newDateStr); // YYYY-MM-DD
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    
    // Atualiza o executionDeadline em lote
    await tenantPrisma.delivery.updateMany({
      where: {
        id: { in: deliveryIds }
      },
      data: {
        executionDeadline: newDate
      }
    });

    return { success: true, count: deliveryIds.length };
  }
}
