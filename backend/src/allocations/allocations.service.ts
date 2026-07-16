import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClientManager } from '../prisma/prisma-client-manager';

@Injectable()
export class AllocationsService {
  constructor(private readonly prismaManager: PrismaClientManager) {}

  private getTenantPrisma(tenantId: string) {
    if (!tenantId)
      throw new NotFoundException('ID do escritório não informado.');
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  async create(tenantId: string, createDto: any) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    // Validação de percentual de recorrência obrigatória e soma = 100%
    const prevPercent =
      createDto.predictableRecurrentTimePercentage !== undefined &&
      createDto.predictableRecurrentTimePercentage !== null &&
      createDto.predictableRecurrentTimePercentage !== ''
        ? parseFloat(createDto.predictableRecurrentTimePercentage)
        : null;
    const unprevPercent =
      createDto.unpredictableRecurrentTimePercentage !== undefined &&
      createDto.unpredictableRecurrentTimePercentage !== null &&
      createDto.unpredictableRecurrentTimePercentage !== ''
        ? parseFloat(createDto.unpredictableRecurrentTimePercentage)
        : null;

    if (
      prevPercent === null ||
      unprevPercent === null ||
      isNaN(prevPercent) ||
      isNaN(unprevPercent)
    ) {
      throw new BadRequestException(
        'Os percentuais de tempo recorrente previsível e não previsível são obrigatórios.',
      );
    }

    if (prevPercent + unprevPercent !== 100) {
      throw new BadRequestException(
        'A soma do tempo recorrente previsível e não previsível deve ser exatamente 100%.',
      );
    }

    return tenantPrisma.employeeCycleAllocation.create({
      data: {
        employeeId: createDto.employeeId,
        cycleId: createDto.cycleId,
        frontId: createDto.frontId,
        subdivisionId: createDto.subdivisionId || null,
        leaderId: createDto.leaderId || null,
        dailyAvailableTime: createDto.dailyAvailableTime
          ? parseFloat(createDto.dailyAvailableTime)
          : null,
        predictableRecurrentTimePercentage: prevPercent,
        unpredictableRecurrentTimePercentage: unprevPercent,
        allocationStartDate: createDto.allocationStartDate
          ? new Date(createDto.allocationStartDate)
          : null,
        allocationEndDate: createDto.allocationEndDate
          ? new Date(createDto.allocationEndDate)
          : null,
        status: createDto.status || 'ACTIVE',
      },
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
        cycle: true,
      },
    });
  }

  async update(tenantId: string, id: string, updateDto: any) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    // Validação de percentual de recorrência obrigatória e soma = 100%
    const prevPercent =
      updateDto.predictableRecurrentTimePercentage !== undefined &&
      updateDto.predictableRecurrentTimePercentage !== null &&
      updateDto.predictableRecurrentTimePercentage !== ''
        ? parseFloat(updateDto.predictableRecurrentTimePercentage)
        : null;
    const unprevPercent =
      updateDto.unpredictableRecurrentTimePercentage !== undefined &&
      updateDto.unpredictableRecurrentTimePercentage !== null &&
      updateDto.unpredictableRecurrentTimePercentage !== ''
        ? parseFloat(updateDto.unpredictableRecurrentTimePercentage)
        : null;

    if (
      prevPercent === null ||
      unprevPercent === null ||
      isNaN(prevPercent) ||
      isNaN(unprevPercent)
    ) {
      throw new BadRequestException(
        'Os percentuais de tempo recorrente previsível e não previsível são obrigatórios.',
      );
    }

    if (prevPercent + unprevPercent !== 100) {
      throw new BadRequestException(
        'A soma do tempo recorrente previsível e não previsível deve ser exatamente 100%.',
      );
    }

    return tenantPrisma.employeeCycleAllocation.update({
      where: { id },
      data: {
        employeeId: updateDto.employeeId,
        cycleId: updateDto.cycleId,
        frontId: updateDto.frontId,
        subdivisionId: updateDto.subdivisionId || null,
        leaderId: updateDto.leaderId || null,
        dailyAvailableTime: updateDto.dailyAvailableTime
          ? parseFloat(updateDto.dailyAvailableTime)
          : null,
        predictableRecurrentTimePercentage: prevPercent,
        unpredictableRecurrentTimePercentage: unprevPercent,
        allocationStartDate: updateDto.allocationStartDate
          ? new Date(updateDto.allocationStartDate)
          : null,
        allocationEndDate: updateDto.allocationEndDate
          ? new Date(updateDto.allocationEndDate)
          : null,
        status: updateDto.status,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    return tenantPrisma.employeeCycleAllocation.delete({
      where: { id },
    });
  }
}
