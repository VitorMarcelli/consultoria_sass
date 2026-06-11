import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientManager } from '../prisma/prisma-client-manager';

@Injectable()
export class EmployeesService {
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
    return tenantPrisma.employee.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, data: any) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    return tenantPrisma.employee.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        status: data.status || 'ACTIVE',
        grossSalary: data.grossSalary ? parseFloat(data.grossSalary) : null,
        observations: data.observations || null,
      }
    });
  }

  async update(tenantId: string, employeeId: string, data: any) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    return tenantPrisma.employee.update({
      where: { id: employeeId },
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        status: data.status,
        grossSalary: data.grossSalary ? parseFloat(data.grossSalary) : null,
        observations: data.observations,
      }
    });
  }

  async remove(tenantId: string, employeeId: string) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    return tenantPrisma.employee.delete({
      where: { id: employeeId }
    });
  }
}
