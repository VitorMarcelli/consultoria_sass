import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientManager } from '../prisma/prisma-client-manager';

@Injectable()
export class StructuresService {
  constructor(
    private readonly globalPrisma: PrismaService,
    private readonly prismaManager: PrismaClientManager,
  ) {}

  private getTenantPrisma(tenantId: string) {
    if (!tenantId) throw new NotFoundException('ID do escritório não informado.');
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  private async checkAdmin(userId: string) {
    const user = await this.globalPrisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas Administradores podem gerenciar Frentes.');
    }
  }

  async findAllFronts(tenantId: string) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    return tenantPrisma.operationalFront.findMany({
      include: {
        subdivisions: {
          include: { leader: true }
        }
      },
      orderBy: { name: 'asc' },
    });
  }

  async createFront(tenantId: string, data: any, userId: string) {
    await this.checkAdmin(userId);
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    return tenantPrisma.operationalFront.create({
      data: {
        name: data.name,
        status: data.status || 'ACTIVE',
        observations: data.observations || null,
      }
    });
  }

  async createSubdivision(tenantId: string, data: any) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    return tenantPrisma.subdivision.create({
      data: {
        name: data.name,
        status: data.status || 'ACTIVE',
        frontId: data.frontId,
        leaderId: data.leaderId || null,
        observations: data.observations || null,
      }
    });
  }

  async updateFront(tenantId: string, id: string, data: any, userId: string) {
    await this.checkAdmin(userId);
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    return tenantPrisma.operationalFront.update({
      where: { id },
      data: {
        name: data.name,
        status: data.status,
        observations: data.observations,
      }
    });
  }

  async removeFront(tenantId: string, id: string, userId: string) {
    await this.checkAdmin(userId);
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    return tenantPrisma.operationalFront.delete({
      where: { id }
    });
  }

  async updateSubdivision(tenantId: string, id: string, data: any) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    return tenantPrisma.subdivision.update({
      where: { id },
      data: {
        name: data.name,
        status: data.status,
        leaderId: data.leaderId || null,
        observations: data.observations,
      }
    });
  }

  async removeSubdivision(tenantId: string, id: string) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    return tenantPrisma.subdivision.delete({
      where: { id }
    });
  }
}
