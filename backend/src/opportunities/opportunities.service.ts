import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientManager } from '../prisma/prisma-client-manager';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class OpportunitiesService {
  private readonly logger = new Logger(OpportunitiesService.name);

  constructor(
    private readonly globalPrisma: PrismaService,
    private readonly prismaManager: PrismaClientManager,
  ) {}

  private getTenantPrisma(tenantId: string) {
    if (!tenantId) throw new NotFoundException('ID do escritório não informado.');
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  async findAll(tenantId: string, clientId?: string) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    return tenantPrisma.opportunity.findMany({
      where: clientId ? { clientId } : {},
      include: { client: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, data: any) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    return tenantPrisma.opportunity.create({
      data: {
        clientId: data.clientId,
        title: data.title,
        category: data.category || 'UPSELL',
        triggerType: data.triggerType || 'MANUAL',
        potentialValue: data.potentialValue ? parseFloat(data.potentialValue) : null,
        status: data.status || 'IDENTIFIED',
        observations: data.observations,
        clientPortalSummary: data.clientPortalSummary || 'Análise de ganho de eficiência operacional e financeira.',
      },
      include: { client: true },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    return tenantPrisma.opportunity.update({
      where: { id },
      data: {
        title: data.title,
        category: data.category,
        triggerType: data.triggerType,
        potentialValue: data.potentialValue ? parseFloat(data.potentialValue) : undefined,
        status: data.status,
        observations: data.observations,
        clientPortalSummary: data.clientPortalSummary,
      },
      include: { client: true },
    });
  }

  async remove(tenantId: string, id: string) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    return tenantPrisma.opportunity.delete({
      where: { id },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyScan() {
    this.logger.log('Iniciando scan automático de oportunidades...');
    const tenants = await this.globalPrisma.tenant.findMany({ where: { status: 'ACTIVE' } });
    for (const tenant of tenants) {
      try {
        await this.scanAndGenerateOpportunities(tenant.id);
      } catch (err) {
        this.logger.error(`Erro ao gerar oportunidades para tenant ${tenant.id}`, err);
      }
    }
    this.logger.log('Scan automático de oportunidades concluído.');
  }

  async scanAndGenerateOpportunities(tenantId: string) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    const clients = await tenantPrisma.client.findMany({
      include: {
        frontClassifications: {
          include: {
            taxInfo: true,
            hrInfo: true,
            accountingInfo: true,
          },
        },
        timeLogs: {
          where: { status: 'FINISHED' },
        },
        deliveries: true,
      },
    });

    let generatedCount = 0;
    const apiKey = process.env.GEMINI_API_KEY;

    for (const client of clients) {
      const totalHours = client.timeLogs.reduce((acc, log) => acc + (log.durationMinutes || 0), 0) / 60;
      const totalCost = client.timeLogs.reduce((acc, log) => acc + (log.costAmount || 0), 0);
      const monthlyFee = client.monthlyFee || 0;
      const profitMargin = monthlyFee - totalCost;

      const lateDeliveries = client.deliveries.filter(d => d.status === 'ATRASADA' || (d.legalDeadline && new Date() > new Date(d.legalDeadline) && d.status !== 'ENTREGUE')).length;
      
      let hrVolume = 0;
      let taxVolume = 0;
      for (const front of client.frontClassifications) {
        if (front.hrInfo?.frequentAdmissions) hrVolume += 1;
        if (front.taxInfo?.monthlyNotesVolume) taxVolume += parseInt(front.taxInfo.monthlyNotesVolume.replace(/\D/g, ''), 10) || 0;
      }

      // Se tiver chave da IA configurada, usa o Gemini
      if (apiKey) {
        try {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          
          const prompt = `
            Você é um consultor estratégico para escritórios de contabilidade.
            Analise os dados do cliente "${client.name}" e sugira UMA oportunidade de negócio ou melhoria, se houver necessidade real.
            Dados do cliente no mês:
            - Horas gastas pela equipe: ${totalHours.toFixed(1)}h
            - Custo estimado da equipe: R$ ${totalCost.toFixed(2)}
            - Honorários recebidos: R$ ${monthlyFee.toFixed(2)}
            - Margem de lucro bruta: R$ ${profitMargin.toFixed(2)}
            - Entregas atrasadas/risco: ${lateDeliveries}
            - Indicador de alta rotatividade no RH: ${hrVolume > 0 ? 'Sim' : 'Não'}
            - Volume de Notas Fiscais: ${taxVolume}

            Regras:
            - Responda APENAS em JSON válido, sem markdown.
            - Formato esperado: { "temOportunidade": boolean, "title": "...", "category": "UPSELL" | "CROSSSELL" | "RETENTION", "triggerType": "IA_ANALYSIS", "potentialValue": number, "observations": "...", "clientPortalSummary": "..." }
            - Use RETENTION se o cliente der prejuízo. Use UPSELL se houver muito volume não cobrado. Use CROSSSELL se houver gargalo que um BPO resolva.
            - Se estiver tudo equilibrado, retorne "temOportunidade": false.
          `;

          const result = await model.generateContent(prompt);
          let text = result.response.text();
          text = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const aiInsight = JSON.parse(text);

          if (aiInsight.temOportunidade && aiInsight.title) {
             const exists = await tenantPrisma.opportunity.findFirst({
               where: { clientId: client.id, title: aiInsight.title, status: 'IDENTIFIED' },
             });
             
             if (!exists) {
               await tenantPrisma.opportunity.create({
                 data: {
                   clientId: client.id,
                   title: aiInsight.title,
                   category: aiInsight.category,
                   triggerType: 'IA_ANALYSIS',
                   potentialValue: aiInsight.potentialValue || 0,
                   observations: aiInsight.observations,
                   clientPortalSummary: aiInsight.clientPortalSummary,
                 },
               });
               generatedCount++;
             }
          }
        } catch (err) {
          this.logger.error(`Erro ao gerar oportunidade via IA para o cliente ${client.id}:`, err);
        }
      } else {
        // Fallback para lógica estática se não tiver IA configurada
        if (totalHours > 15 && profitMargin < 0) {
          const title = 'Revisão de Escopo: Custo de Horas Acima da Margem';
          const exists = await tenantPrisma.opportunity.findFirst({
            where: { clientId: client.id, triggerType: 'EXCESS_HOURS', status: 'IDENTIFIED' },
          });

          if (!exists) {
            await tenantPrisma.opportunity.create({
              data: {
                clientId: client.id,
                title,
                category: 'UPSELL',
                triggerType: 'EXCESS_HOURS',
                potentialValue: monthlyFee * 0.5,
                observations: `Identificado ${totalHours.toFixed(1)}h alocadas gerando prejuízo. Custo: R$ ${totalCost.toFixed(2)}, Receita: R$ ${monthlyFee}.`,
                clientPortalSummary: 'Estudo executivo para otimização de escopo e garantia de equilíbrio operacional no atendimento.',
              },
            });
            generatedCount++;
          }
        }
      }
    }

    return { success: true, generatedCount };
  }

  async getDashboardData(tenantId: string) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    
    // Total Revenue (soma das mensalidades de todos clientes ativos)
    const activeClients = await tenantPrisma.client.findMany({ where: { status: 'ACTIVE' } });
    const totalRevenue = activeClients.reduce((acc, c) => acc + (c.monthlyFee || 0), 0);

    // Custos totais do mês atual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);
    const recentTimeLogs = await tenantPrisma.timeLog.findMany({
      where: { status: 'FINISHED', createdAt: { gte: startOfMonth } }
    });
    const totalCosts = recentTimeLogs.reduce((acc, log) => acc + (log.costAmount || 0), 0);

    // Oportunidades Identificadas
    const opps = await tenantPrisma.opportunity.findMany({
      include: { client: true },
      orderBy: { createdAt: 'desc' }
    });

    const categoriesMap = { UPSELL: 0, CROSSSELL: 0, RETENTION: 0 };
    opps.forEach(o => {
      if (categoriesMap[o.category] !== undefined) categoriesMap[o.category]++;
    });

    // Simulando histórico de evolução (idealmente calculado do DB)
    const evolutionChart = [
      { name: 'Jan', revenue: totalRevenue * 0.7, costs: totalCosts * 0.6 },
      { name: 'Fev', revenue: totalRevenue * 0.8, costs: totalCosts * 0.7 },
      { name: 'Mar', revenue: totalRevenue * 0.9, costs: totalCosts * 0.8 },
      { name: 'Abr', revenue: totalRevenue * 0.95, costs: totalCosts * 0.9 },
      { name: 'Mai', revenue: totalRevenue, costs: totalCosts },
      { name: 'Atual', revenue: totalRevenue, costs: totalCosts },
    ];

    return {
      kpis: {
        totalRevenue,
        totalCosts,
        margin: totalRevenue - totalCosts,
        totalOpportunities: opps.length,
      },
      charts: {
        evolution: evolutionChart,
        categories: [
          { name: 'Upsell', value: categoriesMap.UPSELL },
          { name: 'Cross-sell', value: categoriesMap.CROSSSELL },
          { name: 'Retenção', value: categoriesMap.RETENTION },
        ]
      },
      recentActivity: opps.slice(0, 5),
    };
  }
}

