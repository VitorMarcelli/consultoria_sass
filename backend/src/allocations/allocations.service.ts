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
        predictableRecurrentTimePercentage: createDto.predictableRecurrentTimePercentage !== undefined && createDto.predictableRecurrentTimePercentage !== null ? parseFloat(createDto.predictableRecurrentTimePercentage) : null,
        unpredictableRecurrentTimePercentage: createDto.unpredictableRecurrentTimePercentage !== undefined && createDto.unpredictableRecurrentTimePercentage !== null ? parseFloat(createDto.unpredictableRecurrentTimePercentage) : null,
        allocationStartDate: createDto.allocationStartDate ? new Date(createDto.allocationStartDate) : null,
        allocationEndDate: createDto.allocationEndDate ? new Date(createDto.allocationEndDate) : null,
        status: createDto.status || 'ACTIVE',
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
        predictableRecurrentTimePercentage: updateDto.predictableRecurrentTimePercentage !== undefined && updateDto.predictableRecurrentTimePercentage !== null ? parseFloat(updateDto.predictableRecurrentTimePercentage) : null,
        unpredictableRecurrentTimePercentage: updateDto.unpredictableRecurrentTimePercentage !== undefined && updateDto.unpredictableRecurrentTimePercentage !== null ? parseFloat(updateDto.unpredictableRecurrentTimePercentage) : null,
        allocationStartDate: updateDto.allocationStartDate ? new Date(updateDto.allocationStartDate) : null,
        allocationEndDate: updateDto.allocationEndDate ? new Date(updateDto.allocationEndDate) : null,
        status: updateDto.status,
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
