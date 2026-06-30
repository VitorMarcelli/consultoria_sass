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
        foundationDate: (data.foundationDate?.toString().trim() === '') ? null : (data.foundationDate ? new Date(data.foundationDate) : undefined),
        certificateExpiration: (data.certificateExpiration?.toString().trim() === '') ? null : (data.certificateExpiration ? new Date(data.certificateExpiration) : undefined),
        tradeName: data.tradeName,
        taxRegime: data.taxRegime,
        segment: data.segment,
        revenueBracket: data.revenueBracket,
        hasEconomicGroup: data.hasEconomicGroup,
        economicGroupName: data.economicGroupName,
        monthlyFee: (data.monthlyFee !== undefined && data.monthlyFee !== null && data.monthlyFee.toString().trim() !== '') ? Number(data.monthlyFee) : ((data.monthlyFee === '' || data.monthlyFee?.toString().trim() === '') ? null : undefined),
        classification: data.classification,
        observations: data.observations,
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

  async bulkImport(tenantId: string, clientsData: any[]) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    
    // Fetch all fronts to map them
    const allFronts = await tenantPrisma.operationalFront.findMany();
    const getFrontId = (keyword: string) => allFronts.find(f => f.name.toLowerCase().includes(keyword.toLowerCase()))?.id;

    const fiscalFrontId = getFrontId('fiscal');
    const contabilFrontId = getFrontId('contábil') || getFrontId('contabil');
    const dpFrontId = getFrontId('dp') || getFrontId('departamento') || getFrontId('pessoal');

    // Fetch employees for name resolution (memoized per bulk run)
    const allEmployees = await tenantPrisma.employee.findMany();
    const getEmployeeId = (name: string | undefined | null) => {
      if (!name) return null;
      return allEmployees.find(e => e.name.toLowerCase().trim() === name.toLowerCase().trim())?.id || null;
    };

    let importedCount = 0;

    for (const data of clientsData) {
      if (!data.name) continue;

      let clientId = null;
      if (data.cnpj) {
        const existing = await tenantPrisma.client.findUnique({ where: { cnpj: data.cnpj } });
        clientId = existing?.id;
      }
      
      const clientData = {
        name: data.name,
        cnpj: data.cnpj || null,
        tradeName: data.tradeName || null,
        email: data.email || null,
        phone: data.phone || null,
        contactName: data.contactName || null,
        zipCode: data.zipCode || null,
        address: data.address || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        taxRegime: data.taxRegime || null,
        segment: data.segment || null,
        revenueBracket: data.revenueBracket || null,
        hasEconomicGroup: data.hasEconomicGroup || false,
        economicGroupName: data.economicGroupName || null,
        monthlyFee: data.monthlyFee ? Number(data.monthlyFee) : null,
        classification: data.classification || null,
        status: data.status || 'ACTIVE',
      };

      if (!clientId) {
        // Create new client
        const newClient = await tenantPrisma.client.create({
          data: clientData
        });
        clientId = newClient.id;
      } else {
        // Update existing client name and other fields
        await tenantPrisma.client.update({
          where: { id: clientId },
          data: clientData
        });
      }

      // Assign to fronts
      const assignFront = async (
        frontId: string | undefined, 
        shouldAssign: boolean,
        frontType: 'fiscal' | 'dp' | 'contabil',
        classificationData: any,
        infoData: any
      ) => {
        if (!frontId) return;
        
        const existingAssignment = await tenantPrisma.clientFrontClassification.findUnique({
          where: { clientId_frontId: { clientId, frontId } }
        });

        const leaderId = getEmployeeId(classificationData.leaderName);
        const operator1Id = getEmployeeId(classificationData.op1Name);
        const operator2Id = getEmployeeId(classificationData.op2Name);

        const classificationPayload = {
          leaderId,
          operator1Id,
          operator2Id,
          frequency: classificationData.frequency || null,
          complexity: classificationData.complexity !== undefined ? Number(classificationData.complexity) : null,
          particulars: classificationData.particulars || null,
        };

        let classificationId: string;

        if (shouldAssign) {
          if (!existingAssignment) {
            const newAssign = await tenantPrisma.clientFrontClassification.create({
              data: {
                clientId,
                frontId,
                actsInFront: 'YES',
                ...classificationPayload
              }
            });
            classificationId = newAssign.id;
          } else {
             const updatedAssign = await tenantPrisma.clientFrontClassification.update({
               where: { id: existingAssignment.id },
               data: { actsInFront: 'YES', ...classificationPayload }
             });
             classificationId = updatedAssign.id;
          }

          // Create or update specific info
          if (frontType === 'fiscal') {
             await tenantPrisma.clientTaxInfo.upsert({
               where: { classificationId },
               create: { classificationId, ...infoData },
               update: infoData
             });
          } else if (frontType === 'dp') {
             await tenantPrisma.clientHrInfo.upsert({
               where: { classificationId },
               create: { classificationId, ...infoData },
               update: infoData
             });
          } else if (frontType === 'contabil') {
             await tenantPrisma.clientAccountingInfo.upsert({
               where: { classificationId },
               create: { classificationId, ...infoData },
               update: infoData
             });
          }
        }
      };

      await assignFront(fiscalFrontId, data.fiscal, 'fiscal', {
        leaderName: data.fiscalLeaderName,
        op1Name: data.fiscalOp1Name,
        op2Name: data.fiscalOp2Name,
        frequency: data.fiscalFrequency,
        complexity: data.fiscalComplexity,
        particulars: data.fiscalParticulars
      }, {
        monthlyNotesVolume: data.fiscalNotesVolume || null,
        outNotesVolume: data.fiscalOutNotesVolume || null,
        inNotesVolume: data.fiscalInNotesVolume || null,
        automationLevel: data.fiscalAutomationLevel || null,
        hasSpecialRegime: data.fiscalHasSpecialRegime || false,
        specialRegimeDescription: data.fiscalSpecialRegimeDesc || null,
        inNfeMethods: data.fiscalInNfe || null,
        outNfeMethods: data.fiscalOutNfe || null,
        nfseMethods: data.fiscalNfse || null,
        sendingChannels: data.fiscalSendingChannels || null,
        fiscalSystem: data.fiscalSystem || null,
        notesPlatform: data.fiscalNotesPlatform || null,
        meetsDeadlines: data.fiscalMeetsDeadlines || null,
      });

      await assignFront(dpFrontId, data.dp, 'dp', {
        leaderName: data.dpLeaderName,
        op1Name: data.dpOp1Name,
        op2Name: data.dpOp2Name,
        frequency: data.dpFrequency,
        complexity: data.dpComplexity,
        particulars: data.dpParticulars
      }, {
        employeesCount: data.dpEmployeesCount !== undefined ? Number(data.dpEmployeesCount) : null,
        prolaboreCount: data.dpProlaboreCount !== undefined ? Number(data.dpProlaboreCount) : null,
        domesticsCount: data.dpDomesticsCount !== undefined ? Number(data.dpDomesticsCount) : null,
        pointReceiptMethod: data.dpPointReceipt || null,
        variablesLaunchMethod: data.dpVariablesLaunch || null,
        processingType: data.dpProcessingType || null,
        sheetSendingMethod: data.dpSheetSending || null,
        frequentAdmissions: data.dpFrequentAdmissions || false,
      });

      await assignFront(contabilFrontId, data.contabil, 'contabil', {
        leaderName: data.contabilLeaderName,
        op1Name: data.contabilOp1Name,
        op2Name: data.contabilOp2Name,
        frequency: data.contabilFrequency,
        complexity: data.contabilComplexity,
        particulars: data.contabilParticulars
      }, {
        bookkeepingRegime: data.contabilBookkeepingRegime || null,
        lastClosingMonth: data.contabilLastClosing || null,
        closingPeriod: data.contabilClosingPeriod || null,
        infoReceiptFrequency: data.contabilInfoReceiptFreq || null,
        infoReceiptMethod: data.contabilInfoReceiptMethod || null,
        integrationLevel: data.contabilIntegrationLevel || null,
        trialBalanceNeed: data.contabilTrialBalanceNeed || null,
        launchesVolume: data.contabilLaunchesVolume || null,
      });

      importedCount++;
    }

    return { success: true, imported: importedCount };
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
    
    if (data.foundationDate !== undefined) {
      updateData.foundationDate = (data.foundationDate?.toString().trim() === '') ? null : new Date(data.foundationDate);
    }
    if (data.certificateExpiration !== undefined) {
      updateData.certificateExpiration = (data.certificateExpiration?.toString().trim() === '') ? null : new Date(data.certificateExpiration);
    }
    if (data.monthlyFee !== undefined) {
      updateData.monthlyFee = (data.monthlyFee?.toString().trim() === '') ? null : Number(data.monthlyFee);
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
