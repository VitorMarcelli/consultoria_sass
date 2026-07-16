import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientManager } from '../prisma/prisma-client-manager';

@Injectable()
export class ClientClassificationsService {
  constructor(
    private readonly globalPrisma: PrismaService,
    private readonly prismaManager: PrismaClientManager,
  ) {}

  private getTenantPrisma(tenantId: string) {
    if (!tenantId)
      throw new NotFoundException('ID do escritório não informado.');
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  async findAll(tenantId: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    return tenantPrisma.clientFrontClassification.findMany({
      orderBy: { clientId: 'asc' },
    });
  }

  async upsert(tenantId: string, data: any) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    // data should contain: clientId, frontId, actsInFront (boolean string 'YES' or 'NO'), leaderId (optional)

    const existing = await tenantPrisma.clientFrontClassification.findUnique({
      where: {
        clientId_frontId: {
          clientId: data.clientId,
          frontId: data.frontId,
        },
      },
    });

    if (existing) {
      return tenantPrisma.clientFrontClassification.update({
        where: { id: existing.id },
        data: {
          actsInFront: data.actsInFront,
          leaderId:
            data.leaderId !== undefined ? data.leaderId : existing.leaderId,
        },
      });
    } else {
      return tenantPrisma.clientFrontClassification.create({
        data: {
          clientId: data.clientId,
          frontId: data.frontId,
          actsInFront: data.actsInFront,
          leaderId: data.leaderId || null,
        },
      });
    }
  }
}
