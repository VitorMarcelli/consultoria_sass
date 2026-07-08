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
    const startOfCurrentMonth = new Date();
    startOfCurrentMonth.setDate(1);
    startOfCurrentMonth.setHours(0,0,0,0);
    const recentTimeLogs = await tenantPrisma.timeLog.findMany({
      where: { status: 'FINISHED', createdAt: { gte: startOfCurrentMonth } }
    });
    const totalCosts = recentTimeLogs.reduce((acc, log) => acc + (log.costAmount || 0), 0);

    // Oportunidades Identificadas
    const opps = await tenantPrisma.opportunity.findMany({
      include: { client: true },
      orderBy: { createdAt: 'desc' }
    });

    const categoriesMap: Record<string, number> = {
      UPSELL: 0,
      CROSSSELL: 0,
      RETENTION: 0
    };

    let wonCount = 0;
    let finishedCount = 0;

    // Calcular o Health Score na listagem (simplificado baseado em custo vs receita)
    const recentTimeLogsForHealth = await tenantPrisma.timeLog.findMany({
      where: { status: 'FINISHED', createdAt: { gte: startOfCurrentMonth } }
    });

    const clientCostsMap: Record<string, number> = {};
    recentTimeLogsForHealth.forEach(log => {
      if (log.clientId) {
        clientCostsMap[log.clientId] = (clientCostsMap[log.clientId] || 0) + (log.costAmount || 0);
      }
    });

    const recentActivityWithHealth = opps.map(o => {
      if (o.status === 'GANHA') wonCount++;
      if (o.status === 'GANHA' || o.status === 'PERDIDA') finishedCount++;

      if (categoriesMap[o.category as keyof typeof categoriesMap] !== undefined) {
        categoriesMap[o.category as keyof typeof categoriesMap]++;
      } else {
        categoriesMap['OUTROS'] = (categoriesMap['OUTROS'] || 0) + 1;
      }

      // Calcula a margem para dar um health score
      let healthScore = 'GREEN'; // Default saudavel
      if (o.client && o.client.id) {
        const cost = clientCostsMap[o.client.id] || 0;
        const rev = o.client.monthlyFee || 0;
        if (cost > rev) {
          healthScore = 'RED'; // Prejuízo
        } else if (cost > rev * 0.8) {
          healthScore = 'YELLOW'; // Risco
        }
      }

      return { ...o, healthScore };
    });

    const winRate = finishedCount > 0 ? (wonCount / finishedCount) * 100 : 0;

    // Calculando histórico real (últimos 6 meses)
    const evolutionChart = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date();
      start.setMonth(start.getMonth() - i);
      start.setDate(1);
      start.setHours(0,0,0,0);

      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      const logs = await tenantPrisma.timeLog.findMany({
        where: {
          status: 'FINISHED',
          createdAt: { gte: start, lt: end }
        }
      });
      const monthCost = logs.reduce((acc, l) => acc + (l.costAmount || 0), 0);

      // Assumindo receita recorrente aproximada baseada nos clientes criados ate o fim daquele mes
      const clientsBeforeEnd = activeClients.filter(c => c.createdAt < end);
      const monthRevenue = clientsBeforeEnd.reduce((acc, c) => acc + (c.monthlyFee || 0), 0);

      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      evolutionChart.push({
        name: i === 0 ? 'Atual' : monthNames[start.getMonth()],
        revenue: monthRevenue,
        costs: monthCost
      });
    }

    return {
      kpis: {
        totalRevenue,
        totalCosts,
        margin: totalRevenue - totalCosts,
        totalOpportunities: opps.length,
        winRate,
      },
      charts: {
        evolution: evolutionChart,
        categories: [
          { name: 'Upsell', value: categoriesMap.UPSELL },
          { name: 'Cross-sell', value: categoriesMap.CROSSSELL },
          { name: 'Retenção', value: categoriesMap.RETENTION },
        ]
      },
      recentActivity: recentActivityWithHealth,
    };
  }

  async generateEmail(tenantId: string, opportunityId: string) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    
    const opportunity = await tenantPrisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: { client: true }
    });

    if (!opportunity) throw new NotFoundException('Oportunidade não encontrada');

    if (!process.env.GEMINI_API_KEY) {
      return { emailBody: 'Prezado(a) cliente,\\n\\nNotamos uma necessidade de revisar seus honorários devido ao aumento na volumetria.\\n\\nPodemos agendar uma reunião?\\n\\nAtenciosamente,\\nEquipe Sevilha' };
    }

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Você é um diretor comercial de contabilidade.
Escreva um e-mail diplomático, profissional e persuasivo para o cliente "${opportunity.client?.name}" justificando uma revisão contratual ou oferta de serviço.
Categoria do contato: ${opportunity.category}.
Justificativa interna: ${opportunity.observations}
Valor estimado da proposta: R$ ${opportunity.potentialValue} (use esse valor se fizer sentido citar, caso contrário não cite).
O e-mail deve ser amigável, propondo uma reunião para apresentar a solução. Assine como 'Equipe Sevilha Contabilidade'. Não use placeholders com colchetes, gere pronto para envio.`;

      const result = await model.generateContent(prompt);
      const emailBody = result.response.text();
      return { emailBody };
    } catch (e) {
      console.error('Erro Gemini Gen Email:', e);
      return { emailBody: 'Erro ao conectar com a IA. Tente novamente mais tarde.' };
    }
  }
}

