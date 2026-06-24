import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientManager } from '../prisma/prisma-client-manager';

@Injectable()
export class OpportunitiesService {
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
      },
    });

    let generatedCount = 0;

    for (const client of clients) {
      // 1. Gatilho de Excesso de Horas (EXCESS_HOURS)
      const totalHours = client.timeLogs.reduce((acc, log) => acc + (log.durationMinutes || 0), 0) / 60;
      const monthlyFee = client.monthlyFee || 0;

      if (totalHours > 15 && monthlyFee < 1500) {
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
              potentialValue: monthlyFee * 0.5, // 50% de incremento sugerido
              observations: `Identificado ${totalHours.toFixed(1)}h alocadas para uma mensalidade de R$ ${monthlyFee}. Margem comprometida.`,
              clientPortalSummary: 'Estudo executivo para otimização de escopo e garantia de equilíbrio operacional no atendimento.',
            },
          });
          generatedCount++;
        }
      }

      // 2. Gatilho de Volume Fiscal (NFE_VOLUME_SPIKE)
      for (const classification of client.frontClassifications) {
        if (classification.taxInfo?.monthlyNotesVolume) {
          const volume = parseInt(classification.taxInfo.monthlyNotesVolume.replace(/\D/g, ''), 10);
          if (volume >= 1000) {
            const title = 'BPO Financeiro e Automação Fiscal Avançada';
            const exists = await tenantPrisma.opportunity.findFirst({
              where: { clientId: client.id, triggerType: 'NFE_VOLUME_SPIKE', status: 'IDENTIFIED' },
            });

            if (!exists) {
              await tenantPrisma.opportunity.create({
                data: {
                  clientId: client.id,
                  title,
                  category: 'CROSSSELL',
                  triggerType: 'NFE_VOLUME_SPIKE',
                  potentialValue: 1800.0,
                  observations: `Alto volume fiscal identificado: ${classification.taxInfo.monthlyNotesVolume} notas/mês. Cliente qualificado para automação e BPO.`,
                  clientPortalSummary: 'Proposta de integração via inteligência artificial para eliminar digitação manual e agilizar relatórios gerenciais.',
                },
              });
              generatedCount++;
            }
          }
        }

        // 3. Gatilho de Admissões Frequentes (FREQUENT_ADMISSIONS)
        if (classification.hrInfo?.frequentAdmissions) {
          const title = 'Auditoria e Automação em Rotinas de Admissão (DP)';
          const exists = await tenantPrisma.opportunity.findFirst({
            where: { clientId: client.id, triggerType: 'FREQUENT_ADMISSIONS', status: 'IDENTIFIED' },
          });

          if (!exists) {
            await tenantPrisma.opportunity.create({
              data: {
                clientId: client.id,
                title,
                category: 'CROSSSELL',
                triggerType: 'FREQUENT_ADMISSIONS',
                potentialValue: 1200.0,
                observations: 'Indicador de admissões frequentes ativo no eSocial/DP. Alto risco de conformidade e gargalo operacional.',
                clientPortalSummary: 'Projeto de estruturação de fluxo digital de admissão para mitigar riscos de passivos trabalhistas.',
              },
            });
            generatedCount++;
          }
        }
      }
    }

    return { success: true, generatedCount };
  }
}
