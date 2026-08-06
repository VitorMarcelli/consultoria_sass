import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClientManager } from '../prisma/prisma-client-manager';
import { TaxonomyService } from '../taxonomy/taxonomy.service';

@Injectable()
export class ActivityCatalogService {
  constructor(
    private readonly prismaManager: PrismaClientManager,
    private readonly taxonomyService: TaxonomyService,
  ) {}

  private getTenantPrisma(tenantId: string) {
    if (!tenantId)
      throw new NotFoundException('ID do escritório não informado.');
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  // Único ponto onde os nós da taxonomia (schema public) são resolvidos e
  // anexados às atividades do catálogo (schema do tenant) — evita que quem
  // consome esta API precise fazer 2 chamadas e juntar na mão.
  private async withTaxonomyLabels<
    T extends { taxonomyNodeId: string | null; subActivities?: any[] },
  >(activities: T[]): Promise<any[]> {
    const ids = new Set<string>();
    for (const activity of activities) {
      if (activity.taxonomyNodeId) ids.add(activity.taxonomyNodeId);
      for (const sub of activity.subActivities || []) {
        if (sub.taxonomyNodeId) ids.add(sub.taxonomyNodeId);
      }
    }
    const nodes = await this.taxonomyService.resolveNodes([...ids]);
    const nodesById = new Map(nodes.map((n) => [n.id, n]));

    const attach = (activity: any): any => ({
      ...activity,
      taxonomyNode: activity.taxonomyNodeId
        ? nodesById.get(activity.taxonomyNodeId) || null
        : null,
      subActivities: (activity.subActivities || []).map(attach),
    });

    return activities.map(attach);
  }

  async findAll(tenantId: string, frontId?: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    const activities = await tenantPrisma.activityCatalog.findMany({
      where: {
        frontId: frontId || undefined,
        parentActivityId: null, // top-level; sub-atividades vêm aninhadas abaixo
      },
      include: {
        subActivities: {
          include: { checklistTemplates: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
        checklistTemplates: { orderBy: { order: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });
    return this.withTaxonomyLabels(activities);
  }

  async findOne(tenantId: string, id: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    const activity = await tenantPrisma.activityCatalog.findUnique({
      where: { id },
      include: {
        subActivities: {
          include: { checklistTemplates: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
        checklistTemplates: { orderBy: { order: 'asc' } },
      },
    });
    if (!activity) throw new NotFoundException('Atividade não encontrada.');
    const [withLabels] = await this.withTaxonomyLabels([activity]);
    return withLabels;
  }

  // Undefined/null/'' → null (regra ausente); qualquer outro valor → inteiro.
  // Mesma tolerância de input do defaultEstimatedTimeMinutes já existente.
  private parseIntOrNull(value: any): number | null {
    return value !== undefined && value !== null && value !== ''
      ? parseInt(value, 10)
      : null;
  }

  async create(tenantId: string, data: any) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    const compositionMode = data.compositionMode || 'SIMPLE';

    return tenantPrisma.$transaction(async (tx) => {
      const activity = await tx.activityCatalog.create({
        data: {
          frontId: data.frontId,
          name: data.name,
          taxonomyNodeId: data.taxonomyNodeId || null,
          compositionMode,
          defaultEstimatedTimeMinutes: data.defaultEstimatedTimeMinutes
            ? parseInt(data.defaultEstimatedTimeMinutes, 10)
            : null,
          status: data.status || 'ACTIVE',
          legalDeadlineDay: this.parseIntOrNull(data.legalDeadlineDay),
          internalDeadlineOffsetDays: this.parseIntOrNull(
            data.internalDeadlineOffsetDays,
          ),
          executionDeadlineOffsetDays: this.parseIntOrNull(
            data.executionDeadlineOffsetDays,
          ),
        },
      });

      if (
        compositionMode === 'CHECKLIST' &&
        Array.isArray(data.checklistTemplates)
      ) {
        await tx.activityCatalogChecklistItem.createMany({
          data: data.checklistTemplates.map((item: any, index: number) => ({
            activityId: activity.id,
            description: item.description,
            order: item.order ?? index,
          })),
        });
      }

      if (compositionMode === 'SUBTASKS' && Array.isArray(data.subActivities)) {
        for (const [index, sub] of data.subActivities.entries()) {
          await tx.activityCatalog.create({
            data: {
              frontId: data.frontId,
              name: sub.name,
              // Sub-atividade herda a classificação do pai se não vier uma própria.
              taxonomyNodeId: sub.taxonomyNodeId || data.taxonomyNodeId || null,
              // A própria sub-atividade decide sua forma (tipicamente SIMPLE
              // ou CHECKLIST) — independente do modo SUBTASKS do pai.
              compositionMode: sub.compositionMode || 'SIMPLE',
              defaultEstimatedTimeMinutes: sub.defaultEstimatedTimeMinutes
                ? parseInt(sub.defaultEstimatedTimeMinutes, 10)
                : null,
              parentActivityId: activity.id,
              order: sub.order ?? index,
              status: 'ACTIVE',
              // Sub-atividade vira sua própria Delivery quando usada — exige
              // sua própria regra de prazos, sem herdar do pai (diferente da
              // classificação/taxonomia): herdar prazo silenciosamente seria
              // mais arriscado que herdar uma classificação.
              legalDeadlineDay: this.parseIntOrNull(sub.legalDeadlineDay),
              internalDeadlineOffsetDays: this.parseIntOrNull(
                sub.internalDeadlineOffsetDays,
              ),
              executionDeadlineOffsetDays: this.parseIntOrNull(
                sub.executionDeadlineOffsetDays,
              ),
            },
          });
        }
      }

      return tx.activityCatalog.findUnique({
        where: { id: activity.id },
        include: { subActivities: true, checklistTemplates: true },
      });
    });
  }

  // Atualiza só os campos "planos" da atividade. Trocar compositionMode ou
  // reestruturar subActivities/checklistTemplates fica para quando a tela de
  // edição existir (fora do escopo desta leva, que é só a fundação de API).
  async update(tenantId: string, id: string, data: any) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    return tenantPrisma.activityCatalog.update({
      where: { id },
      data: {
        name: data.name,
        frontId: data.frontId,
        taxonomyNodeId: data.taxonomyNodeId,
        defaultEstimatedTimeMinutes:
          data.defaultEstimatedTimeMinutes !== undefined
            ? data.defaultEstimatedTimeMinutes
              ? parseInt(data.defaultEstimatedTimeMinutes, 10)
              : null
            : undefined,
        status: data.status,
        legalDeadlineDay:
          data.legalDeadlineDay !== undefined
            ? this.parseIntOrNull(data.legalDeadlineDay)
            : undefined,
        internalDeadlineOffsetDays:
          data.internalDeadlineOffsetDays !== undefined
            ? this.parseIntOrNull(data.internalDeadlineOffsetDays)
            : undefined,
        executionDeadlineOffsetDays:
          data.executionDeadlineOffsetDays !== undefined
            ? this.parseIntOrNull(data.executionDeadlineOffsetDays)
            : undefined,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    // Local ao schema do tenant (sem o problema cross-schema do
    // TaxonomyNode) — hard delete é seguro aqui; onDelete: Cascade no
    // schema cuida de sub-atividades e checklist templates.
    return tenantPrisma.activityCatalog.delete({ where: { id } });
  }
}
