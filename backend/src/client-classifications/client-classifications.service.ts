import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClientManager } from '../prisma/prisma-client-manager';
import { ComplexityService } from '../complexity/complexity.service';
import { FrontType, CriteriaScores } from '../complexity/complexity.rules';

const FRONT_TYPE_TO_ENGINE: Record<string, FrontType> = {
  FISCAL: 'FISCAL',
  ACCOUNTING: 'CONTABIL',
  HR: 'PESSOAL',
};

@Injectable()
export class ClientClassificationsService {
  constructor(
    private readonly prismaManager: PrismaClientManager,
    private readonly complexityService: ComplexityService,
  ) {}

  private getTenantPrisma(tenantId: string) {
    if (!tenantId)
      throw new NotFoundException('ID do escritório não informado.');
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  async getClassification(tenantId: string, clientId: string, frontId: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    let classification =
      await tenantPrisma.clientFrontClassification.findUnique({
        where: { clientId_frontId: { clientId, frontId } },
        include: {
          taxInfo: true,
          hrInfo: true,
          accountingInfo: true,
          leader: true,
          operator1: true,
          operator2: true,
        },
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
        },
      });
    }

    return classification;
  }

  async updateClassification(
    tenantId: string,
    clientId: string,
    frontId: string,
    data: any,
  ) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    // Também serve pra ler as notas já existentes (scoreService/Tax/
    // Organization/Turnover) — esta tela nunca as edita diretamente (vêm de
    // import ou do Agente de IA), mas precisam ser preservadas ao recalcular
    // o motor depois de mudar um driver de Volume.
    const existing = await this.getClassification(tenantId, clientId, frontId);

    const {
      leaderId,
      operator1Id,
      operator2Id,
      frequency,
      particulars,
      frontType, // 'FISCAL' | 'HR' | 'ACCOUNTING'
      taxInfo,
      hrInfo,
      accountingInfo,
    } = data;

    // `complexity` (LEGADO, 0-3 digitado na planilha) é deliberadamente
    // ignorado aqui: a tela deixou de oferecer o campo (ORDEM-02, Bloco B) e
    // gravá-lo a partir do payload apagaria o histórico das importações
    // antigas toda vez que alguém salvasse a frente. O valor só entra pelo
    // importador; quem manda na complexidade é o motor (complexityClass).
    const updateData: any = {
      leaderId: leaderId || null,
      operator1Id: operator1Id || null,
      operator2Id: operator2Id || null,
      frequency: frequency || null,
      particulars: particulars || null,
    };

    // `actsInFront` era gravado como 'YES' fixo aqui. Nenhuma tela edita esse
    // campo — quem define se a frente está ativa, sem movimento ou encerrada é
    // o cadastro e a importação —, então o efeito real era reativar no cálculo
    // uma frente parada toda vez que alguém abrisse a ficha e salvasse. E
    // frente parada não vale zero: ela sai da média. Reativá-la por engano
    // muda a complexidade do cliente e a média do escritório sem que ninguém
    // tenha respondido nada diferente.
    if (data.actsInFront) updateData.actsInFront = data.actsInFront;

    const actsInFrontAtual = data.actsInFront ?? existing.actsInFront ?? 'YES';

    if (frontType === 'FISCAL' && taxInfo) {
      updateData.taxInfo = {
        upsert: {
          create: {
            ...taxInfo,
            monthlyNotesCount:
              taxInfo.monthlyNotesCount !== undefined &&
              taxInfo.monthlyNotesCount !== ''
                ? Number(taxInfo.monthlyNotesCount)
                : null,
            hasSpecialRegime:
              taxInfo.hasSpecialRegime === true ||
              String(taxInfo.hasSpecialRegime) === 'true',
          },
          update: {
            ...taxInfo,
            monthlyNotesCount:
              taxInfo.monthlyNotesCount !== undefined &&
              taxInfo.monthlyNotesCount !== ''
                ? Number(taxInfo.monthlyNotesCount)
                : null,
            hasSpecialRegime:
              taxInfo.hasSpecialRegime === true ||
              String(taxInfo.hasSpecialRegime) === 'true',
          },
        },
      };
    }

    if (frontType === 'HR' && hrInfo) {
      updateData.hrInfo = {
        upsert: {
          create: {
            ...hrInfo,
            employeesCount: hrInfo.employeesCount
              ? Number(hrInfo.employeesCount)
              : null,
            prolaboreCount: hrInfo.prolaboreCount
              ? Number(hrInfo.prolaboreCount)
              : null,
            domesticsCount: hrInfo.domesticsCount
              ? Number(hrInfo.domesticsCount)
              : null,
            frequentAdmissions:
              hrInfo.frequentAdmissions === true ||
              String(hrInfo.frequentAdmissions) === 'true',
          },
          update: {
            ...hrInfo,
            employeesCount: hrInfo.employeesCount
              ? Number(hrInfo.employeesCount)
              : null,
            prolaboreCount: hrInfo.prolaboreCount
              ? Number(hrInfo.prolaboreCount)
              : null,
            domesticsCount: hrInfo.domesticsCount
              ? Number(hrInfo.domesticsCount)
              : null,
            frequentAdmissions:
              hrInfo.frequentAdmissions === true ||
              String(hrInfo.frequentAdmissions) === 'true',
          },
        },
      };
    }

    if (frontType === 'ACCOUNTING' && accountingInfo) {
      updateData.accountingInfo = {
        upsert: {
          create: {
            ...accountingInfo,
            launchesCount:
              accountingInfo.launchesCount !== undefined &&
              accountingInfo.launchesCount !== ''
                ? Number(accountingInfo.launchesCount)
                : null,
          },
          update: {
            ...accountingInfo,
            launchesCount:
              accountingInfo.launchesCount !== undefined &&
              accountingInfo.launchesCount !== ''
                ? Number(accountingInfo.launchesCount)
                : null,
          },
        },
      };
    }

    // Recalcula Volume + o motor sempre que o driver numérico pode ter
    // mudado — mesmo comportamento do importador (imports.service.ts), só
    // que aqui pra edição pontual em tela. Sem isso, editar um cliente por
    // aqui nunca produzia scoreVolume/complexityClass, e a classificação
    // ficava presa em NOT_ASSESSED/PARTIAL mesmo com tudo preenchido.
    const engineFront = FRONT_TYPE_TO_ENGINE[frontType];
    if (engineFront) {
      let driverValue: number | null = null;
      if (engineFront === 'FISCAL' && taxInfo?.monthlyNotesCount !== undefined) {
        driverValue = taxInfo.monthlyNotesCount === '' ? null : Number(taxInfo.monthlyNotesCount);
      } else if (
        engineFront === 'CONTABIL' &&
        accountingInfo?.launchesCount !== undefined
      ) {
        driverValue =
          accountingInfo.launchesCount === '' ? null : Number(accountingInfo.launchesCount);
      } else if (engineFront === 'PESSOAL' && hrInfo) {
        const funcionarios = hrInfo.employeesCount ? Number(hrInfo.employeesCount) : 0;
        const prolabores = hrInfo.prolaboreCount ? Number(hrInfo.prolaboreCount) : 0;
        const domesticas = hrInfo.domesticsCount ? Number(hrInfo.domesticsCount) : 0;
        driverValue =
          hrInfo.employeesCount || hrInfo.prolaboreCount || hrInfo.domesticsCount
            ? funcionarios + prolabores + domesticas
            : null;
      }

      const volumeResult = this.complexityService.calculateVolumeScore({
        front: engineFront,
        driverValue,
      });
      if (volumeResult.scoreVolume !== null) {
        updateData.scoreVolume = volumeResult.scoreVolume;
        updateData.volumeSource = volumeResult.volumeSource;
      }

      const client = await tenantPrisma.client.findUnique({
        where: { id: clientId },
        select: { status: true },
      });

      const scores: CriteriaScores = {
        scoreVolume: volumeResult.scoreVolume ?? existing.scoreVolume,
        scoreService: existing.scoreService,
        scoreTax: existing.scoreTax,
        scoreOrganization: existing.scoreOrganization,
        scoreTurnover: existing.scoreTurnover,
      };

      const evaluation = this.complexityService.evaluate({
        front: engineFront,
        actsInFront: actsInFrontAtual,
        clientStatus: client?.status ?? 'ACTIVE',
        scores,
      });

      updateData.rawSum = evaluation.rawSum;
      updateData.normalizedScore = evaluation.normalizedScore;
      updateData.complexityClass = evaluation.complexityClass;
      // Uma sugestão de IA pendente (AI_SUGGESTED) não deve virar ASSESSED
      // só porque o Volume mudou — continua exigindo confirmação explícita
      // do consultor (ComplexityAiService.acceptSuggestion).
      if (existing.assessmentState !== 'AI_SUGGESTED') {
        updateData.assessmentState = evaluation.assessmentState;
      }
    }

    return tenantPrisma.clientFrontClassification.update({
      where: { clientId_frontId: { clientId, frontId } },
      data: updateData,
      include: {
        taxInfo: true,
        hrInfo: true,
        accountingInfo: true,
      },
    });
  }
}
