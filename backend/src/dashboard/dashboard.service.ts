import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getCycleMapping(cycleId: string, frontId: string) {
    // Busca todas as classificações da frente com clientes vinculados
    const classifications = await this.prisma.clientFrontClassification.findMany({
      where: { frontId },
      include: {
        client: true,
        taxInfo: true,
        operator1: true,
      },
    });

    const activeClients = classifications.filter(c => c.client.status === 'ACTIVE');
    const inactiveClients = classifications.filter(c => c.client.status !== 'ACTIVE');

    // 1. Status do Cliente
    const statusData = {
      ativos: activeClients.length,
      inativos: inactiveClients.length,
      total: classifications.length
    };

    // 2. Empresas por Tributação
    const regimesMap = new Map<string, number>();
    // 3. Empresas por Segmento
    const segmentsMap = new Map<string, number>();
    // 4. Distribuição Regime x Segmento
    const crossMap = new Map<string, Record<string, number>>(); // Regime -> { Segmento -> Count }
    // 5. Carga por Operador x Complexidade
    const operatorMap = new Map<string, Record<string, number>>(); // OperadorName -> { complexity: Count, total: Count }
    // 6. Formas de Envio
    const sendingChannelsMap = new Map<string, number>();
    // 7. Recebimento de Notas
    const inNotesMethodsMap = new Map<string, number>();

    classifications.forEach(c => {
      const regime = c.client.taxRegime || 'Não Informado';
      const segment = c.client.segment || 'Não Informado';
      const opName = c.operator1?.name || 'Sem Responsável';
      const comp = c.complexity !== null ? c.complexity.toString() : '0';

      // Tributação
      regimesMap.set(regime, (regimesMap.get(regime) || 0) + 1);

      // Segmento
      segmentsMap.set(segment, (segmentsMap.get(segment) || 0) + 1);

      // Cruzamento
      if (!crossMap.has(regime)) crossMap.set(regime, {});
      const segCount = crossMap.get(regime)!;
      segCount[segment] = (segCount[segment] || 0) + 1;

      // Operador
      if (!operatorMap.has(opName)) operatorMap.set(opName, { total: 0 });
      const opData = operatorMap.get(opName)!;
      opData[comp] = (opData[comp] || 0) + 1;
      opData['total'] += 1;

      // Canais
      if (c.taxInfo) {
        if (c.taxInfo.sendingChannels) {
          const channels = c.taxInfo.sendingChannels.split(',').map(s => s.trim());
          channels.forEach(ch => sendingChannelsMap.set(ch, (sendingChannelsMap.get(ch) || 0) + 1));
        }
        if (c.taxInfo.inNfeMethods) {
          const methods = c.taxInfo.inNfeMethods.split(',').map(s => s.trim());
          methods.forEach(m => inNotesMethodsMap.set(m, (inNotesMethodsMap.get(m) || 0) + 1));
        }
      }
    });

    const formatMap = (map: Map<string, any>) => Array.from(map.entries()).map(([name, value]) => ({ name, value }));

    return {
      statusData,
      taxRegimes: formatMap(regimesMap),
      segments: formatMap(segmentsMap),
      regimeVsSegment: Array.from(crossMap.entries()).map(([regime, segments]) => ({ regime, ...segments })),
      operatorComplexity: Array.from(operatorMap.entries()).map(([operator, counts]) => ({ operator, ...counts })),
      sendingChannels: formatMap(sendingChannelsMap),
      inNotesMethods: formatMap(inNotesMethodsMap)
    };
  }

  async getCapacityPlanning(cycleId: string, frontId: string) {
    // 1. Buscamos todas as alocações da equipe na frente deste ciclo
    const allocations = await this.prisma.employeeCycleAllocation.findMany({
      where: { cycleId, frontId, status: 'ACTIVE' },
      include: { employee: true }
    });

    // 2. Buscamos as horas apontadas (TimeLogs) no ciclo e frente atual
    // Como TimeLog não tem cycleId/frontId direto, precisamos filtrar pelas Deliveries desse ciclo/frente
    // Para simplificar agora, pegaremos as entregas do ciclo/frente e cruzaremos
    const deliveries = await this.prisma.delivery.findMany({
      where: { frontId },
      include: { 
        timeReviews: true, // Ou logs
      }
    });

    const timeByEmployee = new Map<string, number>();
    const timeByComplexity = new Map<string, Record<string, number>>();

    // Mock logic for now to structure the response until TimeLog is deeply wired to Deliveries
    const capacityData = allocations.map(alloc => {
      const availableHours = (alloc.dailyAvailableTime || 8) * 21; // ex: 21 dias uteis no mes
      return {
        employee: alloc.employee.name,
        available: availableHours,
        recurrent: Math.floor(availableHours * 0.4), // mock
        extra: Math.floor(availableHours * 0.1), // mock
        rework: Math.floor(availableHours * 0.05) // mock
      };
    });

    return {
      capacityData,
      timeByComplexity: [] 
    };
  }

  async getDailyLeveling(cycleId: string, frontId: string) {
    // Busca todas as entregas do ciclo/frente para montar o Gráfico Heijunka
    const deliveries = await this.prisma.delivery.findMany({
      where: { frontId },
      include: {
        responsible: true,
        client: true
      }
    });

    // Agrupar por data de execução (executionDeadline)
    const dailyCount = new Map<string, number>();
    
    deliveries.forEach(d => {
      if (d.executionDeadline) {
        // Normaliza a data para YYYY-MM-DD
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
      deliveriesList: deliveries // Manda a lista para a tabela interativa
    };
  }

  async rescheduleBulkDeliveries(deliveryIds: string[], newDateStr: string) {
    const newDate = new Date(newDateStr); // YYYY-MM-DD
    
    // Atualiza o executionDeadline em lote
    await this.prisma.delivery.updateMany({
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
