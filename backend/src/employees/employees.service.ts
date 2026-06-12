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
    
    // Inicia uma transação para garantir que a criação do funcionário e sua alocação no ciclo (se houver) aconteçam de forma segura.
    return tenantPrisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          name: data.name,
          email: data.email,
          role: data.role,
          level: data.level || null,
          status: data.status || 'ACTIVE',
          grossSalary: data.grossSalary ? parseFloat(data.grossSalary) : null,
          observations: data.observations || null,
        }
      });

      if (data.cycleId && data.frontId) {
        await tx.employeeCycleAllocation.create({
          data: {
            employeeId: employee.id,
            cycleId: data.cycleId,
            frontId: data.frontId,
            subdivisionId: data.subdivisionId || null,
            dailyAvailableTime: data.allocatedHours ? parseFloat(data.allocatedHours) : 8,
            predictableRecurrentTimePercentage: data.predictableRecurrentTimePercentage !== undefined ? parseFloat(data.predictableRecurrentTimePercentage) : null,
            unpredictableRecurrentTimePercentage: data.unpredictableRecurrentTimePercentage !== undefined ? parseFloat(data.unpredictableRecurrentTimePercentage) : null,
            allocationStartDate: data.allocationStartDate ? new Date(data.allocationStartDate) : null,
            allocationEndDate: data.allocationEndDate ? new Date(data.allocationEndDate) : null,
            status: data.allocationStatus || 'ACTIVE',
          }
        });
      }

      return employee;
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
        level: data.level !== undefined ? data.level : undefined,
        status: data.status,
        grossSalary: data.grossSalary !== undefined ? (data.grossSalary ? parseFloat(data.grossSalary) : null) : undefined,
        observations: data.observations !== undefined ? data.observations : undefined,
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
