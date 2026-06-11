import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClientManager } from '../prisma/prisma-client-manager';

@Injectable()
export class AllocationsService {
  constructor(private readonly prismaManager: PrismaClientManager) {}

  private getTenantPrisma(tenantId: string) {
    if (!tenantId) throw new NotFoundException('ID do escritório não informado.');
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  async create(tenantId: string, createDto: any) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    return tenantPrisma.employeeCycleAllocation.create({
      data: {
        employeeId: createDto.employeeId,
        cycleId: createDto.cycleId,
        frontId: createDto.frontId,
        subdivisionId: createDto.subdivisionId || null,
        leaderId: createDto.leaderId || null,
        dailyAvailableTime: createDto.dailyAvailableTime ? parseFloat(createDto.dailyAvailableTime) : null,
      }
    });
  }

  async findAll(tenantId: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    return tenantPrisma.employeeCycleAllocation.findMany({
      include: {
        employee: true,
        front: true,
        subdivision: true,
        leader: true,
        cycle: true
      }
    });
  }

  async update(tenantId: string, id: string, updateDto: any) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    return tenantPrisma.employeeCycleAllocation.update({
      where: { id },
      data: {
        employeeId: updateDto.employeeId,
        cycleId: updateDto.cycleId,
        frontId: updateDto.frontId,
        subdivisionId: updateDto.subdivisionId || null,
        leaderId: updateDto.leaderId || null,
        dailyAvailableTime: updateDto.dailyAvailableTime ? parseFloat(updateDto.dailyAvailableTime) : null,
      }
    });
  }

  async remove(tenantId: string, id: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    return tenantPrisma.employeeCycleAllocation.delete({
      where: { id }
    });
  }
}
