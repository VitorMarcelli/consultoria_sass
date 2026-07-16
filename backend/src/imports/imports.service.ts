import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientManager } from '../prisma/prisma-client-manager';
import { parse } from 'csv-parse';

@Injectable()
export class ImportsService {
  constructor(
    private readonly globalPrisma: PrismaService,
    private readonly prismaManager: PrismaClientManager,
  ) {}

  private async getTenantPrisma(tenantId: string) {
    if (!tenantId)
      throw new NotFoundException('ID do escritório não informado.');
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  async importClients(tenantId: string, fileBuffer: Buffer) {
    return { success: false, message: 'Use importClientsJson' };
  }

  async importClientsJson(tenantId: string, records: any[], cycleId?: string) {
    const prisma = this.getTenantPrisma(tenantId);
    let count = 0;

    const fronts = await prisma.operationalFront.findMany({
      where: { status: 'ACTIVE' },
    });
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
    });

    const getFront = (name: string) =>
      fronts.find(
        (f) => f.name.toLowerCase().trim() === name.toLowerCase().trim(),
      );
    const getEmployeeId = (name: string) => {
      if (!name || name.trim() === '') return null;
      const e = employees.find((emp) =>
        emp.name.toLowerCase().includes(name.toLowerCase().trim()),
      );
      return e ? e.id : null;
    };

    for (const record of records) {
      const row = record;

      const getVal = (keys: string[]) => {
        const foundKey = Object.keys(row).find((k) =>
          keys.some(
            (expected) =>
              k.toLowerCase().trim() === expected.toLowerCase().trim(),
          ),
        );
        return foundKey ? row[foundKey] : null;
      };

      const name = getVal([
        'Razão Social',
        'Razao Social',
        'razaoSocial',
        'name',
        'Nome',
      ]);
      if (!name) continue;

      const cnpj = getVal(['CNPJ', 'cnpj']);
      const tradeName = getVal([
        'Nome Fantasia',
        'nomeFantasia',
        'tradeName',
        'Fantasia',
      ]);
      const statusVal = getVal(['Status', 'status']) || 'ACTIVE';
      const taxRegime =
        getVal(['Regime Tributário', 'regimeTributario']) || null;
      const segment = getVal(['Segmento', 'segmento']) || null;
      const revenueBracket =
        getVal(['Faixa de Faturamento', 'faixaFaturamento']) || null;
      const feesStr = getVal(['Honorários', 'honorarios']);
      const monthlyFee = feesStr
        ? parseFloat(
            String(feesStr)
              .replace('R$', '')
              .replace(/\./g, '')
              .replace(',', '.')
              .trim(),
          )
        : null;
      const classification = getVal(['Classificação', 'classificacao']) || null;

      let client = cnpj
        ? await prisma.client.findUnique({ where: { cnpj } })
        : null;

      const clientData = {
        name,
        tradeName: tradeName || null,
        status: statusVal,
        taxRegime,
        segment,
        revenueBracket,
        monthlyFee:
          monthlyFee === null || isNaN(monthlyFee) ? null : monthlyFee,
        classification,
      };

      if (client) {
        client = await prisma.client.update({
          where: { id: client.id },
          data: clientData,
        });
      } else {
        client = await prisma.client.create({
          data: { ...clientData, cnpj },
        });
      }

      const processFront = async (frontName: string, prefix: string) => {
        const possui = getVal([`Possui Frente ${frontName}?`]);
        if (possui && String(possui).toUpperCase().trim() === 'SIM') {
          const front = getFront(frontName);
          if (!front) return;

          let classification =
            await prisma.clientFrontClassification.findUnique({
              where: {
                clientId_frontId: { clientId: client.id, frontId: front.id },
              },
            });

          const leaderId = getEmployeeId(
            getVal([`${prefix} - Líder responsável`]),
          );
          const operator1Id = getEmployeeId(getVal([`${prefix} - Operador 1`]));
          const operator2Id = getEmployeeId(getVal([`${prefix} - Operador 2`]));
          const complexityStr = getVal([`${prefix} - Complexidade`]);
          const parsedComplexity = complexityStr
            ? parseInt(String(complexityStr))
            : null;
          const complexity =
            parsedComplexity === null || isNaN(parsedComplexity)
              ? null
              : parsedComplexity;

          const data = {
            actsInFront: 'YES',
            leaderId,
            operator1Id,
            operator2Id,
            complexity,
          };

          if (classification) {
            classification = await prisma.clientFrontClassification.update({
              where: { id: classification.id },
              data,
            });
          } else {
            classification = await prisma.clientFrontClassification.create({
              data: { clientId: client.id, frontId: front.id, ...data },
            });
          }

          if (cycleId) {
            const existingSnapshot = await prisma.clientCycleSnapshot.findFirst(
              {
                where: {
                  clientId: client.id,
                  cycleId: cycleId,
                  frontId: front.id,
                },
              },
            );
            if (!existingSnapshot) {
              await prisma.clientCycleSnapshot.create({
                data: {
                  clientId: client.id,
                  cycleId: cycleId,
                  frontId: front.id,
                  taxRegime: clientData.taxRegime,
                  segment: clientData.segment,
                  monthlyFee: clientData.monthlyFee,
                  classification: clientData.classification,
                  complexity: complexity,
                },
              });
            }
          }
        }
      };

      await processFront('Fiscal', 'Fiscal');
      await processFront('Contábil', 'Contábil');
      await processFront('DP', 'DP');

      count++;
    }

    return {
      success: true,
      count,
      message: `Foram importados/atualizados ${count} clientes com sucesso.`,
    };
  }
}
