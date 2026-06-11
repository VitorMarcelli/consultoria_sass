import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientManager } from '../prisma/prisma-client-manager';

@Injectable()
export class DeliveriesService {
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
}
