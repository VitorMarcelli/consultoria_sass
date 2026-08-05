import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientManager } from '../prisma/prisma-client-manager';
import { parse } from 'csv-parse';
import { ComplexityService } from '../complexity/complexity.service';
import {
  FrontType,
  CriteriaScores,
  EvaluateComplexityResult,
} from '../complexity/complexity.rules';

// Mapeia o "prefixo" de coluna usado na planilha de importação (Fiscal /
// Contábil / DP — ver processFront abaixo) para o FrontType fixo que o motor
// de complexidade entende. Não é o mesmo conceito de OperationalFront.name
// (livre, customizável por tenant) — só essas 3 frentes têm tabela de
// critério definida (ver docs/ORDEM-01-motor-complexidade.md, Bloco B).
const FRONT_TYPE_BY_PREFIX: Record<string, FrontType> = {
  Fiscal: 'FISCAL',
  Contábil: 'CONTABIL',
  DP: 'PESSOAL',
};

@Injectable()
export class ImportsService {
  constructor(
    private readonly globalPrisma: PrismaService,
    private readonly prismaManager: PrismaClientManager,
    private readonly complexityService: ComplexityService,
  ) {}

  private getTenantPrisma(tenantId: string) {
    if (!tenantId)
      throw new NotFoundException('ID do escritório não informado.');
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  async importClients(tenantId: string, fileBuffer: Buffer) {
    return { success: false, message: 'Use importClientsJson' };
  }

  async importClientsJson(
    tenantId: string,
    records: any[],
    cycleId?: string,
    fileName?: string,
    startRow?: number,
  ) {
    const prisma = this.getTenantPrisma(tenantId);
    let count = 0;
    const errors: string[] = [];
    const warnings: string[] = [];
    const fileLabel = fileName || 'arquivo importado';
    // Linha 1 da planilha é o cabeçalho; startRow é a linha real da 1ª
    // entrada deste lote (o frontend manda em lotes de 500 — sem isso, a
    // linha reportada em erro bateria só com a posição dentro do lote).
    const baseRow = startRow ?? 2;

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

    for (let rowIndex = 0; rowIndex < records.length; rowIndex++) {
      const row = records[rowIndex];
      const rowNumber = baseRow + rowIndex;

      const getVal = (keys: string[]) => {
        const foundKey = Object.keys(row).find((k) =>
          keys.some(
            (expected) =>
              k.toLowerCase().trim() === expected.toLowerCase().trim(),
          ),
        );
        return foundKey ? row[foundKey] : null;
      };
      // Distingue "coluna ausente na planilha" de "coluna presente e vazia
      // nesta linha" — necessário pro C2 (colunas ausentes não são erro).
      const hasCol = (keys: string[]) =>
        Object.keys(row).some((k) =>
          keys.some(
            (expected) =>
              k.toLowerCase().trim() === expected.toLowerCase().trim(),
          ),
        );

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
      // Normaliza pra 'ACTIVE'/'INACTIVE' (convenção usada em todo o resto do
      // app, ex: dashboard.service.ts, deliveries.service.ts) — a planilha
      // real de exemplo (docs_cliente) traz "Ativo"/"Inativo" em português, e
      // sem normalizar isso quebra tanto os filtros existentes de cliente
      // ativo quanto a checagem de "frente inativa" do motor de complexidade
      // (C1-C4 abaixo dependem de clientStatus === 'ACTIVE').
      const rawStatus = getVal(['Status', 'status']);
      const statusVal = (() => {
        if (!rawStatus) return 'ACTIVE';
        const normalized = String(rawStatus).trim().toUpperCase();
        if (['ACTIVE', 'ATIVO', 'ATIVA'].includes(normalized)) return 'ACTIVE';
        if (['INACTIVE', 'INATIVO', 'INATIVA'].includes(normalized))
          return 'INACTIVE';
        return normalized; // valor não reconhecido: preserva em vez de adivinhar
      })();
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
        if (!possui || String(possui).toUpperCase().trim() !== 'SIM') return;

        const front = getFront(frontName);
        if (!front) return;

        let classificationRecord =
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

        // C1: legado — nunca usado pra derivar classe/score, só preservado.
        const complexityStr = getVal([`${prefix} - Complexidade`]);
        const parsedComplexity = complexityStr
          ? parseInt(String(complexityStr), 10)
          : null;
        const complexity =
          parsedComplexity === null || isNaN(parsedComplexity)
            ? null
            : parsedComplexity;

        // C2: notas por critério, só se a coluna existir na planilha.
        const noteColumnsByField: Record<
          'scoreVolume' | 'scoreService' | 'scoreTax' | 'scoreOrganization',
          { keys: string[]; label: string }
        > = {
          scoreVolume: {
            keys: [`${prefix} - Nota Volume`],
            label: 'Nota Volume',
          },
          scoreService: {
            keys: [`${prefix} - Nota Atendimento`],
            label: 'Nota Atendimento',
          },
          scoreTax: {
            keys: [`${prefix} - Nota Tributação`],
            label: 'Nota Tributação',
          },
          scoreOrganization: {
            keys: [`${prefix} - Nota Organização`],
            label: 'Nota Organização',
          },
        };

        const hasAnyNoteColumn = Object.values(noteColumnsByField).some((c) =>
          hasCol(c.keys),
        );

        let rowHasInvalidNote = false;
        const parseNote = (
          field: keyof typeof noteColumnsByField,
        ): number | null => {
          // Tributação não se aplica em DP — nunca lida, mesmo se a coluna
          // existir por engano na planilha.
          if (field === 'scoreTax' && prefix === 'DP') return null;

          const { keys, label } = noteColumnsByField[field];
          if (!hasCol(keys)) return null; // coluna ausente: não é erro (C2)

          const raw = getVal(keys);
          if (raw === null || raw === undefined || String(raw).trim() === '') {
            return null; // coluna existe, célula vazia: critério ausente (não erro de validação)
          }

          const parsed = parseInt(String(raw).trim(), 10);
          if (isNaN(parsed) || parsed < 1 || parsed > 3) {
            errors.push(
              `${fileLabel}, linha ${rowNumber}, campo "${prefix} - ${label}": valor "${raw}" inválido — a nota deve ser 1, 2 ou 3.`,
            );
            rowHasInvalidNote = true;
            return null;
          }
          return parsed;
        };

        const scores: CriteriaScores = {
          scoreVolume: parseNote('scoreVolume'),
          scoreService: parseNote('scoreService'),
          scoreTax: parseNote('scoreTax'),
          scoreOrganization: parseNote('scoreOrganization'),
        };

        // Nota fora de 1-3 rejeita a classificação desta frente nesta linha
        // (o Client e as demais frentes da mesma linha seguem normalmente).
        if (rowHasInvalidNote) return;

        // C3: volume numérico ao lado do texto legado — nunca bloqueia,
        // só gera aviso quando não numérico.
        let monthlyNotesCount: number | null = null;
        let launchesCount: number | null = null;
        if (prefix === 'Fiscal') {
          const raw = getVal([`${prefix} - Volume de notas/mês`]);
          if (raw !== null && String(raw).trim() !== '') {
            const digits = String(raw).replace(/\D/g, '');
            const parsed = digits ? parseInt(digits, 10) : NaN;
            if (isNaN(parsed)) {
              warnings.push(
                `${fileLabel}, linha ${rowNumber}: "${prefix} - Volume de notas/mês" não numérico ("${raw}") — driver de volume não calculado para esta linha.`,
              );
            } else {
              monthlyNotesCount = parsed;
            }
          }
        }
        if (prefix === 'Contábil') {
          const raw = getVal([`${prefix} - Total de lançamentos`]);
          if (raw !== null && String(raw).trim() !== '') {
            const digits = String(raw).replace(/\D/g, '');
            const parsed = digits ? parseInt(digits, 10) : NaN;
            if (isNaN(parsed)) {
              warnings.push(
                `${fileLabel}, linha ${rowNumber}: "${prefix} - Total de lançamentos" não numérico ("${raw}") — driver de volume não calculado para esta linha.`,
              );
            } else {
              launchesCount = parsed;
            }
          }
        }

        // C4: o motor sempre decide o resultado final — a importação nunca
        // grava classe sem passar pelo cálculo.
        let assessment: EvaluateComplexityResult;
        if (!hasAnyNoteColumn && complexity !== null) {
          // C1: só a coluna legada veio preenchida — nunca inferir classe dela.
          assessment = {
            rawSum: null,
            normalizedScore: null,
            complexityClass: null,
            assessmentState: 'IMPORTED',
          };
        } else {
          assessment = this.complexityService.evaluate({
            front: FRONT_TYPE_BY_PREFIX[prefix],
            actsInFront: 'YES',
            clientStatus: clientData.status,
            scores,
          });
        }

        const data = {
          actsInFront: 'YES',
          leaderId,
          operator1Id,
          operator2Id,
          complexity,
          ...scores,
          ...assessment,
        };

        if (classificationRecord) {
          classificationRecord = await prisma.clientFrontClassification.update({
            where: { id: classificationRecord.id },
            data,
          });
        } else {
          classificationRecord = await prisma.clientFrontClassification.create({
            data: { clientId: client.id, frontId: front.id, ...data },
          });
        }

        // Grava os drivers numéricos (C3) no TaxInfo/AccountingInfo da
        // classificação, ao lado dos campos String legados (que esta rotina
        // de import não escreve — só os numéricos novos, ver Bloco A).
        if (prefix === 'Fiscal' && monthlyNotesCount !== null) {
          await prisma.clientTaxInfo.upsert({
            where: { classificationId: classificationRecord.id },
            update: { monthlyNotesCount },
            create: {
              classificationId: classificationRecord.id,
              monthlyNotesCount,
            },
          });
        }
        if (prefix === 'Contábil' && launchesCount !== null) {
          await prisma.clientAccountingInfo.upsert({
            where: { classificationId: classificationRecord.id },
            update: { launchesCount },
            create: {
              classificationId: classificationRecord.id,
              launchesCount,
            },
          });
        }

        if (cycleId) {
          const existingSnapshot = await prisma.clientCycleSnapshot.findFirst({
            where: {
              clientId: client.id,
              cycleId: cycleId,
              frontId: front.id,
            },
          });
          // Espelha a avaliação recém-calculada no snapshot congelado do
          // ciclo (campos adicionados no Bloco A) — sem isso, os campos
          // novos do snapshot ficariam sempre nulos vindos de importação.
          const snapshotAssessmentFields = {
            scoreVolume: scores.scoreVolume,
            scoreService: scores.scoreService,
            scoreTax: scores.scoreTax,
            scoreOrganization: scores.scoreOrganization,
            rawSum: assessment.rawSum,
            normalizedScore: assessment.normalizedScore,
            complexityClass: assessment.complexityClass,
            assessmentState: assessment.assessmentState,
          };
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
                ...snapshotAssessmentFields,
              },
            });
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
      errors,
      warnings,
    };
  }
}
