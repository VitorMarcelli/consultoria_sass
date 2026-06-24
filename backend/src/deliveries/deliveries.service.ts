import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientManager } from '../prisma/prisma-client-manager';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(
    private readonly globalPrisma: PrismaService,
    private readonly prismaManager: PrismaClientManager,
  ) {}

  private getTenantPrisma(tenantId: string) {
    if (!tenantId) throw new NotFoundException('ID do escritório não informado.');
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  async findAll(tenantId: string) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    return tenantPrisma.delivery.findMany({
      include: {
        client: true,
        responsible: true,
        leader: true,
        front: true,
        subdivision: true,
        timeReviews: true,
        timeLogs: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, data: any) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    return tenantPrisma.delivery.create({
      data: {
        clientId: data.clientId,
        frontId: data.frontId,
        subdivisionId: data.subdivisionId || null,
        responsibleId: data.responsibleId,
        competence: data.competence,
        originalName: data.originalName,
        standardizedName: data.standardizedName,
        status: data.status || 'PREVISTA'
      }
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    return tenantPrisma.delivery.update({
      where: { id },
      data: {
        clientId: data.clientId,
        frontId: data.frontId,
        subdivisionId: data.subdivisionId,
        responsibleId: data.responsibleId,
        competence: data.competence,
        originalName: data.originalName,
        standardizedName: data.standardizedName,
        status: data.status
      }
    });
  }

  async remove(tenantId: string, id: string) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    return tenantPrisma.delivery.delete({
      where: { id }
    });
  }

  // ========================================================
  // CRON TASS: GERAÇÃO AUTOMÁTICA DE ENTREGAS (Padrão Domínio)
  // ========================================================
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCronDailyDeliveryGeneration() {
    this.logger.log('Iniciando CRON diário para geração automática de entregas (Padrão Domínio)...');
    try {
      const tenants = await this.globalPrisma.tenant.findMany({ where: { status: 'ACTIVE' } });
      for (const tenant of tenants) {
        await this.generateMonthlyDeliveries(tenant.id);
      }
      this.logger.log('CRON diário de entregas executado com sucesso em todos os tenants.');
    } catch (error) {
      this.logger.error('Erro ao executar CRON diário de entregas:', error);
    }
  }

  async generateMonthlyDeliveries(tenantId: string) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const competence = `${month}/${year}`;

    // Garante que existe o ciclo ou checa
    const templates = await tenantPrisma.deliveryTemplate.findMany();
    if (!templates.length) {
      // Injeta alguns templates padrões de mercado se estiver vazio
      await tenantPrisma.deliveryTemplate.createMany({
        data: [
          { taxRegime: 'Simples Nacional', standardizedName: 'Apuração do Simples (DAS)', deliveryGroup: 'Imposto', deliveryType: 'DAS', periodicity: 'Mensal', baseLegalDeadlineDays: 20, defaultComplexity: 1 },
          { taxRegime: 'Simples Nacional', standardizedName: 'Envio de Folha e eSocial', deliveryGroup: 'Folha', deliveryType: 'eSocial', periodicity: 'Mensal', baseLegalDeadlineDays: 15, defaultComplexity: 2 },
          { taxRegime: 'Lucro Presumido', standardizedName: 'EFD Contribuições (PIS/COFINS)', deliveryGroup: 'Imposto', deliveryType: 'SPED', periodicity: 'Mensal', baseLegalDeadlineDays: 15, defaultComplexity: 3 },
          { taxRegime: 'Lucro Presumido', standardizedName: 'SPED Fiscal (ICMS/IPI)', deliveryGroup: 'Imposto', deliveryType: 'SPED', periodicity: 'Mensal', baseLegalDeadlineDays: 20, defaultComplexity: 3 },
        ],
      });
    }

    const activeTemplates = await tenantPrisma.deliveryTemplate.findMany();
    const clients = await tenantPrisma.client.findMany({ where: { status: 'ACTIVE' } });
    let generatedCount = 0;

    for (const client of clients) {
      const clientRegime = client.taxRegime || 'Simples Nacional';
      const matchingTemplates = activeTemplates.filter(t => t.taxRegime === clientRegime);

      // Busca a frente operacional e responsável do cliente para vincular a entrega
      const frontClass = await tenantPrisma.clientFrontClassification.findFirst({
        where: { clientId: client.id },
        include: { front: true, operator1: true, leader: true },
      });

      if (!frontClass || !frontClass.operator1Id) continue; // Pula se não tiver operador configurado

      for (const template of matchingTemplates) {
        const exists = await tenantPrisma.delivery.findFirst({
          where: {
            clientId: client.id,
            competence,
            standardizedName: template.standardizedName,
          },
        });

        if (!exists) {
          let legalDeadline: Date | undefined = undefined;
          if (template.baseLegalDeadlineDays) {
            // Calcula o vencimento para o mês seguinte
            legalDeadline = new Date(year, now.getMonth() + 1, template.baseLegalDeadlineDays);
          }

          await tenantPrisma.delivery.create({
            data: {
              clientId: client.id,
              frontId: frontClass.frontId,
              subdivisionId: frontClass.subdivisionId || null,
              responsibleId: frontClass.operator1Id,
              leaderId: frontClass.leaderId || null,
              competence,
              originalName: template.standardizedName,
              standardizedName: template.standardizedName,
              deliveryClass: template.deliveryClass,
              deliveryGroup: template.deliveryGroup,
              deliveryType: template.deliveryType,
              periodicity: template.periodicity,
              status: 'PREVISTA',
              legalDeadline,
              observations: 'Gerado automaticamente pelo Motor de Matriz de Conformidade TASS.',
            },
          });
          generatedCount++;
        }
      }
    }

    return { success: true, competence, generatedCount };
  }
}
