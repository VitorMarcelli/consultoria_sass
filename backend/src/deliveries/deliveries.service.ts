import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientManager } from '../prisma/prisma-client-manager';
import { TaxonomyService } from '../taxonomy/taxonomy.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(
    private readonly globalPrisma: PrismaService,
    private readonly prismaManager: PrismaClientManager,
    private readonly taxonomyService: TaxonomyService,
  ) {}

  private getTenantPrisma(tenantId: string) {
    if (!tenantId)
      throw new NotFoundException('ID do escritório não informado.');
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  async findAll(tenantId: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
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
    const tenantPrisma = this.getTenantPrisma(tenantId);

    // Quando activityCatalogId vem no body, a Entrega (ou várias, no caso de
    // uma atividade em modo SUBTASKS) é montada a partir do Catálogo de
    // Atividades + Taxonomia global, em vez dos campos digitados à mão.
    // Sem activityCatalogId, o comportamento é idêntico ao de antes.
    if (data.activityCatalogId) {
      return this.createFromActivityCatalog(tenantPrisma, data);
    }

    return tenantPrisma.delivery.create({
      data: this.buildDeliveryCreateData(data),
    });
  }

  // Monta o payload de criação de uma Delivery a partir do body da request,
  // com `overrides` tomando precedência sobre os campos "crus" do body —
  // usado tanto no fluxo manual (sem overrides) quanto no fluxo a partir do
  // Catálogo de Atividades (overrides = nome/classificação/tempo resolvidos).
  private buildDeliveryCreateData(
    data: any,
    overrides: Record<string, any> = {},
  ) {
    return {
      clientId: data.clientId,
      frontId: overrides.frontId ?? data.frontId,
      subdivisionId: data.subdivisionId || null,
      responsibleId: data.responsibleId,
      competence: data.competence,
      originalName: overrides.originalName ?? data.originalName,
      standardizedName: overrides.standardizedName ?? data.standardizedName,
      deliveryClass: overrides.deliveryClass ?? data.deliveryClass ?? null,
      deliveryGroup: overrides.deliveryGroup ?? data.deliveryGroup ?? null,
      deliveryType: overrides.deliveryType ?? data.deliveryType ?? null,
      activityCatalogId: overrides.activityCatalogId ?? null,
      deliveryGroupKey: overrides.deliveryGroupKey ?? null,
      status: data.status || 'PREVISTA',
      priority: data.priority || 'MEDIUM',
      estimatedTimeMinutes:
        overrides.estimatedTimeMinutes !== undefined
          ? overrides.estimatedTimeMinutes
          : data.estimatedTimeMinutes
            ? parseInt(data.estimatedTimeMinutes, 10)
            : null,
      realTimeMinutes: data.realTimeMinutes
        ? parseInt(data.realTimeMinutes, 10)
        : null,
      legalDeadline: data.legalDeadline ? new Date(data.legalDeadline) : null,
      internalDeadline: data.internalDeadline
        ? new Date(data.internalDeadline)
        : null,
      executionDeadline: data.executionDeadline
        ? new Date(data.executionDeadline)
        : null,
      completedAt: data.completedAt ? new Date(data.completedAt) : null,
    };
  }

  // Resolve o breadcrumb da taxonomia (raiz -> folha) de um nó e mapeia para
  // os campos legados de classificação. Mapeamento por profundidade: o 2º
  // nível (ex: "Imposto") vira deliveryGroup, a folha classificada (ex:
  // "PIS") vira deliveryType, e um eventual 3º nível intermediário vira
  // deliveryClass. O 1º nível (ex: "Fiscal") não é usado aqui porque
  // Delivery.frontId já cobre esse conceito operacionalmente.
  private async resolveActivityFields(
    name: string,
    taxonomyNodeId: string | null,
    defaultEstimatedTimeMinutes: number | null,
    requestedEstimatedTimeMinutes: any,
  ) {
    let deliveryGroup: string | null = null;
    let deliveryType: string | null = null;
    let deliveryClass: string | null = null;

    if (taxonomyNodeId) {
      const breadcrumb =
        await this.taxonomyService.getBreadcrumb(taxonomyNodeId);
      if (breadcrumb.length >= 2) deliveryGroup = breadcrumb[1].name;
      else if (breadcrumb.length === 1) deliveryGroup = breadcrumb[0].name;
      if (breadcrumb.length >= 1)
        deliveryType = breadcrumb[breadcrumb.length - 1].name;
      if (breadcrumb.length >= 4) deliveryClass = breadcrumb[2].name;
    }

    return {
      standardizedName: name,
      deliveryGroup,
      deliveryType,
      deliveryClass,
      estimatedTimeMinutes:
        requestedEstimatedTimeMinutes !== undefined &&
        requestedEstimatedTimeMinutes !== null &&
        requestedEstimatedTimeMinutes !== ''
          ? parseInt(requestedEstimatedTimeMinutes, 10)
          : (defaultEstimatedTimeMinutes ?? null),
    };
  }

  private async createFromActivityCatalog(tenantPrisma: any, data: any) {
    const activity = await tenantPrisma.activityCatalog.findUnique({
      where: { id: data.activityCatalogId },
      include: {
        subActivities: { orderBy: { order: 'asc' } },
        checklistTemplates: { orderBy: { order: 'asc' } },
      },
    });
    if (!activity) {
      throw new NotFoundException('Atividade do catálogo não encontrada.');
    }

    // SUBTASKS: a atividade é só um agrupador — cada sub-atividade vira sua
    // própria Delivery, com prazo/responsável próprios, compartilhando o
    // mesmo deliveryGroupKey para a UI conseguir agrupá-las visualmente.
    if (
      activity.compositionMode === 'SUBTASKS' &&
      activity.subActivities.length
    ) {
      const deliveryGroupKey = randomUUID();
      const created = [];
      for (const sub of activity.subActivities) {
        const overrides = await this.resolveActivityFields(
          sub.name,
          sub.taxonomyNodeId,
          sub.defaultEstimatedTimeMinutes,
          undefined,
        );
        created.push(
          await tenantPrisma.delivery.create({
            data: this.buildDeliveryCreateData(data, {
              frontId: sub.frontId,
              ...overrides,
              activityCatalogId: sub.id,
              deliveryGroupKey,
            }),
          }),
        );
      }
      return created;
    }

    const overrides = await this.resolveActivityFields(
      activity.name,
      activity.taxonomyNodeId,
      activity.defaultEstimatedTimeMinutes,
      data.estimatedTimeMinutes,
    );
    const delivery = await tenantPrisma.delivery.create({
      data: this.buildDeliveryCreateData(data, {
        frontId: activity.frontId,
        ...overrides,
        activityCatalogId: activity.id,
      }),
    });

    // CHECKLIST: semeia o checklist operacional da Entrega a partir do
    // template cadastrado na atividade (DeliveryChecklistItem já existia
    // para checklists por-instância, só reaproveitado aqui).
    if (
      activity.compositionMode === 'CHECKLIST' &&
      activity.checklistTemplates.length
    ) {
      await tenantPrisma.deliveryChecklistItem.createMany({
        data: activity.checklistTemplates.map((item: any) => ({
          deliveryId: delivery.id,
          description: item.description,
          order: item.order,
        })),
      });
    }

    return delivery;
  }

  async update(tenantId: string, id: string, data: any) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    // IMPORTANTE: os campos abaixo só entram no update quando presentes no
    // payload (!== undefined). PATCHes parciais são o caso comum (ex: o
    // board de Alocação só manda executionDeadline) — usar `data.x ? ... :
    // null` incondicionalmente apagaria os outros campos de data/tempo a
    // cada chamada parcial, mesmo sem a intenção de limpá-los.
    const optionalFields: Record<string, any> = {};
    if (data.estimatedTimeMinutes !== undefined) {
      optionalFields.estimatedTimeMinutes = data.estimatedTimeMinutes
        ? parseInt(data.estimatedTimeMinutes, 10)
        : null;
    }
    if (data.realTimeMinutes !== undefined) {
      optionalFields.realTimeMinutes = data.realTimeMinutes
        ? parseInt(data.realTimeMinutes, 10)
        : null;
    }
    if (data.legalDeadline !== undefined) {
      optionalFields.legalDeadline = data.legalDeadline
        ? new Date(data.legalDeadline)
        : null;
    }
    if (data.internalDeadline !== undefined) {
      optionalFields.internalDeadline = data.internalDeadline
        ? new Date(data.internalDeadline)
        : null;
    }
    if (data.executionDeadline !== undefined) {
      optionalFields.executionDeadline = data.executionDeadline
        ? new Date(data.executionDeadline)
        : null;
    }
    if (data.completedAt !== undefined) {
      optionalFields.completedAt = data.completedAt
        ? new Date(data.completedAt)
        : null;
    }

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
        status: data.status,
        priority: data.priority,
        ...optionalFields,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    // Soft delete: preserva o histórico (checklists, provas, timesheets,
    // comparação mês a mês) em vez de apagar em cascata. Ver
    // docs/PRDcliente.md — "Status em vez de exclusão". 'INATIVA' já é um
    // status reconhecido pelo Kanban/board de entregas no frontend.
    return tenantPrisma.delivery.update({
      where: { id },
      data: { status: 'INATIVA' },
    });
  }

  // ========================================================
  // CRON TASS: GERAÇÃO AUTOMÁTICA DE ENTREGAS (Padrão Domínio)
  // ========================================================
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCronDailyDeliveryGeneration() {
    this.logger.log(
      'Iniciando CRON diário para geração automática de entregas (Padrão Domínio)...',
    );
    try {
      const tenants = await this.globalPrisma.tenant.findMany({
        where: { status: 'ACTIVE' },
      });
      for (const tenant of tenants) {
        await this.generateMonthlyDeliveries(tenant.id);
      }
      this.logger.log(
        'CRON diário de entregas executado com sucesso em todos os tenants.',
      );
    } catch (error) {
      this.logger.error('Erro ao executar CRON diário de entregas:', error);
    }
  }

  async generateMonthlyDeliveries(tenantId: string, targetCompetence?: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    let competence = targetCompetence;
    if (!competence) {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      competence = `${month}/${year}`;
    }

    // Garante que existe o ciclo ou checa
    const templates = await tenantPrisma.deliveryTemplate.findMany();
    if (!templates.length) {
      // Injeta alguns templates padrões de mercado se estiver vazio
      await tenantPrisma.deliveryTemplate.createMany({
        data: [
          {
            taxRegime: 'Simples Nacional',
            standardizedName: 'Apuração do Simples (DAS)',
            deliveryGroup: 'Imposto',
            deliveryType: 'DAS',
            periodicity: 'Mensal',
            baseLegalDeadlineDays: 20,
            defaultComplexity: 1,
          },
          {
            taxRegime: 'Simples Nacional',
            standardizedName: 'Envio de Folha e eSocial',
            deliveryGroup: 'Folha',
            deliveryType: 'eSocial',
            periodicity: 'Mensal',
            baseLegalDeadlineDays: 15,
            defaultComplexity: 2,
          },
          {
            taxRegime: 'Lucro Presumido',
            standardizedName: 'EFD Contribuições (PIS/COFINS)',
            deliveryGroup: 'Imposto',
            deliveryType: 'SPED',
            periodicity: 'Mensal',
            baseLegalDeadlineDays: 15,
            defaultComplexity: 3,
          },
          {
            taxRegime: 'Lucro Presumido',
            standardizedName: 'SPED Fiscal (ICMS/IPI)',
            deliveryGroup: 'Imposto',
            deliveryType: 'SPED',
            periodicity: 'Mensal',
            baseLegalDeadlineDays: 20,
            defaultComplexity: 3,
          },
        ],
      });
    }

    const activeTemplates = await tenantPrisma.deliveryTemplate.findMany();
    const clients = await tenantPrisma.client.findMany({
      where: { status: 'ACTIVE' },
    });
    let generatedCount = 0;

    for (const client of clients) {
      const clientRegime = client.taxRegime || 'Simples Nacional';
      const matchingTemplates = activeTemplates.filter(
        (t) => t.taxRegime === clientRegime,
      );

      // Busca a frente operacional e responsável do cliente para vincular a entrega
      const frontClass = await tenantPrisma.clientFrontClassification.findFirst(
        {
          where: { clientId: client.id },
          include: { front: true, operator1: true, leader: true },
        },
      );

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
            // Calcula o vencimento para o mês seguinte baseado na competência
            const [compMonthStr, compYearStr] = competence.split('/');
            const compYearNum = Number(compYearStr);
            const compMonthNum = Number(compMonthStr) - 1; // 0-indexed month
            legalDeadline = new Date(
              compYearNum,
              compMonthNum + 1,
              template.baseLegalDeadlineDays,
            );
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
              observations:
                'Gerado automaticamente pelo Motor de Matriz de Conformidade TASS.',
            },
          });
          generatedCount++;
        }
      }
    }

    return { success: true, competence, generatedCount };
  }

  // ========================================================
  // AÇÕES RÁPIDAS (SLIDE-OVER)
  // ========================================================

  async updateStatus(
    tenantId: string,
    id: string,
    status: string,
    authorName: string = 'Sistema',
  ) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    // Data de Entrega/Realização: preenchida automaticamente ao concluir,
    // limpa se a tarefa for reaberta (deixa de fazer sentido "concluída em X"
    // para uma tarefa que não está mais concluída).
    const completedAt = status === 'CONCLUIDA' ? new Date() : null;

    const updated = await tenantPrisma.delivery.update({
      where: { id },
      data: { status, completedAt },
    });

    await tenantPrisma.deliveryHistory.create({
      data: {
        deliveryId: id,
        action: 'STATUS_CHANGED',
        description: `Status alterado para ${status}`,
        authorName,
      },
    });
    return updated;
  }

  async updateEstimatedTime(
    tenantId: string,
    id: string,
    estimatedTimeMinutes: number,
    authorName: string = 'Sistema',
  ) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    const updated = await tenantPrisma.delivery.update({
      where: { id },
      data: {
        estimatedTimeMinutes: estimatedTimeMinutes
          ? parseInt(String(estimatedTimeMinutes), 10)
          : null,
      },
    });

    await tenantPrisma.deliveryHistory.create({
      data: {
        deliveryId: id,
        action: 'COMMENT',
        description: estimatedTimeMinutes
          ? `Atualizou o tempo estimado para ${Math.floor(estimatedTimeMinutes / 60)}h ${estimatedTimeMinutes % 60}m`
          : 'Removeu o tempo estimado',
        authorName,
      },
    });
    return updated;
  }

  async getSlideOverData(tenantId: string, id: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    return tenantPrisma.delivery.findUnique({
      where: { id },
      include: {
        checklists: { orderBy: { createdAt: 'asc' } },
        proofs: { orderBy: { createdAt: 'desc' } },
        history: { orderBy: { createdAt: 'desc' } },
        timeLogs: true,
      },
    });
  }

  async addChecklistItem(
    tenantId: string,
    deliveryId: string,
    description: string,
  ) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    return tenantPrisma.deliveryChecklistItem.create({
      data: { deliveryId, description },
    });
  }

  async toggleChecklistItem(
    tenantId: string,
    deliveryId: string,
    itemId: string,
    isCompleted: boolean,
  ) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    return tenantPrisma.deliveryChecklistItem.update({
      where: { id: itemId },
      data: { isCompleted },
    });
  }

  async removeChecklistItem(
    tenantId: string,
    deliveryId: string,
    itemId: string,
  ) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    return tenantPrisma.deliveryChecklistItem.delete({
      where: { id: itemId },
    });
  }

  async addProof(
    tenantId: string,
    deliveryId: string,
    title: string,
    url: string,
    authorName: string,
  ) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    const proof = await tenantPrisma.deliveryProof.create({
      data: { deliveryId, title, url, addedBy: authorName },
    });

    await tenantPrisma.deliveryHistory.create({
      data: {
        deliveryId,
        action: 'PROOF_ADDED',
        description: `Anexou o comprovante: ${title}`,
        authorName,
      },
    });
    return proof;
  }

  async removeProof(tenantId: string, deliveryId: string, proofId: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    return tenantPrisma.deliveryProof.delete({
      where: { id: proofId },
    });
  }

  async addHistoryComment(
    tenantId: string,
    deliveryId: string,
    description: string,
    authorName: string,
  ) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    return tenantPrisma.deliveryHistory.create({
      data: {
        deliveryId,
        action: 'COMMENT',
        description,
        authorName,
      },
    });
  }

  // =====================================
  // TIME TRACKER
  // =====================================

  async startTimer(tenantId: string, deliveryId: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    // Verifica se a entrega tem responsável
    const delivery = await tenantPrisma.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) throw new NotFoundException('Entrega não encontrada.');
    if (!delivery.responsibleId) {
      throw new Error(
        'A entrega precisa de um responsável atribuído para iniciar o tempo.',
      );
    }

    // Verifica se já tem um rodando
    const runningLog = await tenantPrisma.timeLog.findFirst({
      where: {
        deliveryId,
        status: 'RUNNING',
      },
    });

    if (runningLog) {
      return runningLog; // Se já tem, devolve ele (evita duplo clique)
    }

    return tenantPrisma.timeLog.create({
      data: {
        deliveryId,
        clientId: delivery.clientId,
        employeeId: delivery.responsibleId,
        startTime: new Date(),
        status: 'RUNNING',
      },
    });
  }

  async stopTimer(tenantId: string, deliveryId: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    const runningLog = await tenantPrisma.timeLog.findFirst({
      where: {
        deliveryId,
        status: 'RUNNING',
      },
    });

    if (!runningLog) {
      throw new Error('Não há nenhum timer rodando para esta entrega.');
    }

    const endTime = new Date();
    const durationMinutes = Math.max(
      1,
      Math.round((endTime.getTime() - runningLog.startTime.getTime()) / 60000),
    );

    // Atualiza o TimeLog
    const finishedLog = await tenantPrisma.timeLog.update({
      where: { id: runningLog.id },
      data: {
        status: 'FINISHED',
        endTime,
        durationMinutes,
      },
    });

    // Soma o tempo na entrega
    const delivery = await tenantPrisma.delivery.findUnique({
      where: { id: deliveryId },
    });
    const currentRealTime = delivery?.realTimeMinutes || 0;
    const newRealTimeMinutes = currentRealTime + durationMinutes;

    let newStatus = delivery?.status;
    let becameOverdue = false;

    if (
      delivery?.estimatedTimeMinutes &&
      delivery?.status !== 'CONCLUIDA' &&
      delivery?.status !== 'ATRASADA' &&
      newRealTimeMinutes > delivery.estimatedTimeMinutes
    ) {
      newStatus = 'ATRASADA';
      becameOverdue = true;
    }

    await tenantPrisma.delivery.update({
      where: { id: deliveryId },
      data: {
        realTimeMinutes: newRealTimeMinutes,
        status: newStatus,
      },
    });

    if (becameOverdue) {
      await tenantPrisma.deliveryHistory.create({
        data: {
          deliveryId,
          action: 'STATUS_CHANGED',
          description: `Status alterado automaticamente para ATRASADA (tempo limite excedido)`,
          authorName: 'Sistema (Timer)',
        },
      });
    }

    return finishedLog;
  }
}
