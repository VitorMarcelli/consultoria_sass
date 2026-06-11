import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientManager } from '../prisma/prisma-client-manager';

@Injectable()
export class ClientsService {
  constructor(
    private readonly globalPrisma: PrismaService,
    private readonly prismaManager: PrismaClientManager,
  ) {}

  private getTenantPrisma(tenantId: string) {
    if (!tenantId) throw new NotFoundException('ID do escritório não informado.');
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  async create(tenantId: string, data: any, cycleId?: string, frontId?: string, subdivisionId?: string) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);

    if (!data.cnpj) {
      throw new ConflictException('O CNPJ é obrigatório para registrar um cliente.');
    }

    // Verify unique CNPJ inside this Tenant's schema
    const existingClient = await tenantPrisma.client.findUnique({
      where: { cnpj: data.cnpj },
    });
    if (existingClient) {
      throw new ConflictException('Já existe um cliente com este CNPJ cadastrado nesta consultoria.');
    }

    const newClient = await tenantPrisma.client.create({
      data: {
        name: data.name,
        cnpj: data.cnpj,
        status: data.status || 'ACTIVE',
        email: data.email || null,
        phone: data.phone || null,
        contactName: data.contactName || null,
        address: data.address || null,
        neighborhood: data.neighborhood || null,
        zipCode: data.zipCode || null,
        city: data.city || null,
        state: data.state || null,
        ie: data.ie || null,
        im: data.im || null,
        cnae: data.cnae || null,
        foundationDate: data.foundationDate ? new Date(data.foundationDate) : null,
        certificateExpiration: data.certificateExpiration ? new Date(data.certificateExpiration) : null,
      },
    });

    if (frontId) {
      // Cria a classificação global para a frente (para rollover do próximo mês)
      await tenantPrisma.clientFrontClassification.create({
        data: {
          clientId: newClient.id,
          frontId: frontId,
          subdivisionId: subdivisionId || null,
          actsInFront: 'YES'
        }
      });
    }

    if (cycleId && frontId) {
      await tenantPrisma.clientCycleSnapshot.create({
        data: {
          cycleId: cycleId,
          clientId: newClient.id,
          frontId: frontId,
          subdivisionId: subdivisionId || null,
          taxRegime: data.taxRegime || null,
          segment: data.segment || null,
          monthlyFee: data.monthlyFee ? Number(data.monthlyFee) : null,
          classification: data.classification || null,
        }
      });
    }

    return newClient;
  }

  async findAll(tenantId: string) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    return tenantPrisma.client.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    const client = await tenantPrisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    return client;
  }

  async update(tenantId: string, id: string, data: any) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    
    // Check if client exists
    await this.findOne(tenantId, id);

    // If data.cnpj is explicitly empty, we throw error
    if (data.cnpj === '' || data.cnpj === null) {
      throw new ConflictException('O CNPJ não pode ser removido.');
    }

    // Verify unique CNPJ if updating it
    if (data.cnpj) {
      const existingClient = await tenantPrisma.client.findFirst({
        where: { 
          cnpj: data.cnpj,
          id: { not: id }
        },
      });
      if (existingClient) {
        throw new ConflictException('Já existe outro cliente com este CNPJ cadastrado.');
      }
    }

    const updateData: any = { ...data };
    if (data.foundationDate) {
      updateData.foundationDate = new Date(data.foundationDate);
    }
    if (data.certificateExpiration) {
      updateData.certificateExpiration = new Date(data.certificateExpiration);
    }

    return tenantPrisma.client.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(tenantId: string, id: string) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    
    // Check if client exists
    await this.findOne(tenantId, id);

    return tenantPrisma.client.delete({
      where: { id },
    });
  }
}
