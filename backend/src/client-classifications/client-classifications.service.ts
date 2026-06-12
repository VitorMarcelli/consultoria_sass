import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClientManager } from '../prisma/prisma-client-manager';

@Injectable()
export class ClientClassificationsService {
  constructor(private readonly prismaManager: PrismaClientManager) {}

  private getTenantPrisma(tenantId: string) {
    if (!tenantId) throw new NotFoundException('ID do escritório não informado.');
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  async getClassification(tenantId: string, clientId: string, frontId: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    
    let classification = await tenantPrisma.clientFrontClassification.findUnique({
      where: { clientId_frontId: { clientId, frontId } },
      include: {
        taxInfo: true,
        hrInfo: true,
        accountingInfo: true,
        leader: true,
        operator1: true,
        operator2: true,
      }
    });

    if (!classification) {
      classification = await tenantPrisma.clientFrontClassification.create({
        data: {
          clientId,
          frontId,
          actsInFront: 'NO',
        },
        include: {
          taxInfo: true,
          hrInfo: true,
          accountingInfo: true,
          leader: true,
          operator1: true,
          operator2: true,
        }
      });
    }

    return classification;
  }

  async updateClassification(tenantId: string, clientId: string, frontId: string, data: any) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    // Make sure classification exists
    await this.getClassification(tenantId, clientId, frontId);

    const {
      leaderId,
      operator1Id,
      operator2Id,
      frequency,
      complexity,
      particulars,
      frontType, // 'FISCAL' | 'HR' | 'ACCOUNTING'
      taxInfo,
      hrInfo,
      accountingInfo
    } = data;

    const updateData: any = {
      leaderId: leaderId || null,
      operator1Id: operator1Id || null,
      operator2Id: operator2Id || null,
      frequency: frequency || null,
      complexity: complexity ? Number(complexity) : null,
      particulars: particulars || null,
      actsInFront: 'YES'
    };

    if (frontType === 'FISCAL' && taxInfo) {
      updateData.taxInfo = {
        upsert: {
          create: { ...taxInfo, hasSpecialRegime: taxInfo.hasSpecialRegime === true || String(taxInfo.hasSpecialRegime) === 'true' },
          update: { ...taxInfo, hasSpecialRegime: taxInfo.hasSpecialRegime === true || String(taxInfo.hasSpecialRegime) === 'true' }
        }
      };
    }

    if (frontType === 'HR' && hrInfo) {
      updateData.hrInfo = {
        upsert: {
          create: { 
            ...hrInfo, 
            employeesCount: hrInfo.employeesCount ? Number(hrInfo.employeesCount) : null,
            prolaboreCount: hrInfo.prolaboreCount ? Number(hrInfo.prolaboreCount) : null,
            domesticsCount: hrInfo.domesticsCount ? Number(hrInfo.domesticsCount) : null,
            frequentAdmissions: hrInfo.frequentAdmissions === true || String(hrInfo.frequentAdmissions) === 'true'
          },
          update: { 
            ...hrInfo, 
            employeesCount: hrInfo.employeesCount ? Number(hrInfo.employeesCount) : null,
            prolaboreCount: hrInfo.prolaboreCount ? Number(hrInfo.prolaboreCount) : null,
            domesticsCount: hrInfo.domesticsCount ? Number(hrInfo.domesticsCount) : null,
            frequentAdmissions: hrInfo.frequentAdmissions === true || String(hrInfo.frequentAdmissions) === 'true'
          }
        }
      };
    }

    if (frontType === 'ACCOUNTING' && accountingInfo) {
      updateData.accountingInfo = {
        upsert: {
          create: { ...accountingInfo },
          update: { ...accountingInfo }
        }
      };
    }

    return tenantPrisma.clientFrontClassification.update({
      where: { clientId_frontId: { clientId, frontId } },
      data: updateData,
      include: {
        taxInfo: true,
        hrInfo: true,
        accountingInfo: true
      }
    });
  }
}
