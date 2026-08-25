import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientManager } from '../prisma/prisma-client-manager';
import { ComplexityService } from '../complexity/complexity.service';
import {
  FrontType,
  CriteriaScores,
  EvaluateComplexityResult,
} from '../complexity/complexity.rules';

// Frentes fixas que o motor de complexidade entende (não é o mesmo conceito
// de OperationalFront.name, livre por tenant — ver complexity.rules.ts).
const FRONT_TYPE: Record<'fiscal' | 'contabil' | 'pessoal', FrontType> = {
  fiscal: 'FISCAL',
  contabil: 'CONTABIL',
  pessoal: 'PESSOAL',
};
const FRONT_DISPLAY_NAME: Record<'fiscal' | 'contabil' | 'pessoal', string> = {
  fiscal: 'Fiscal',
  contabil: 'Contábil',
  pessoal: 'Pessoal',
};

type RawRow = Record<string, any>;

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

  private normalizeDoc(raw: any): string | null {
    if (raw === null || raw === undefined) return null;
    const digits = String(raw).replace(/\D/g, '');
    return digits || null;
  }

  private getVal(row: RawRow, keys: string[]) {
    const foundKey = Object.keys(row).find((k) =>
      keys.some(
        (expected) => k.toLowerCase().trim() === expected.toLowerCase().trim(),
      ),
    );
    return foundKey ? row[foundKey] : null;
  }

  // Distingue "coluna ausente na planilha" de "coluna presente e vazia nesta
  // linha" — necessário pra nunca converter ausência de critério em erro ou
  // em C0 (motor de complexidade trata isso como PARTIAL/NOT_ASSESSED).
  private hasCol(row: RawRow, keys: string[]) {
    return Object.keys(row).some((k) =>
      keys.some(
        (expected) => k.toLowerCase().trim() === expected.toLowerCase().trim(),
      ),
    );
  }

  // Template MVP REV03 (01_Clientes / Áreas): Ativo, Sem movimento, Inativo,
  // Encerrado — normaliza pra maiúsculas; convenção ACTIVE/INACTIVE do resto
  // do app é preservada para os dois casos que ela já reconhece, os demais
  // ficam com o valor em maiúsculas (o motor de complexidade só compara
  // "=== 'ACTIVE'", então "SEM MOVIMENTO"/"ENCERRADO" já bloqueiam certo).
  private normalizeStatus(raw: any): string {
    if (!raw) return 'ACTIVE';
    const normalized = String(raw).trim().toUpperCase();
    if (['ACTIVE', 'ATIVO', 'ATIVA'].includes(normalized)) return 'ACTIVE';
    if (['INACTIVE', 'INATIVO', 'INATIVA'].includes(normalized))
      return 'INACTIVE';
    return normalized;
  }

  // Status da frente (por área/ciclo) vira actsInFront pro motor de
  // complexidade: Ativo→YES, Sem movimento→NO_MOVEMENT, Inativo/Encerrado→NO.
  private statusFrenteToActsInFront(raw: any): string {
    if (!raw) return 'YES';
    const normalized = String(raw).trim().toUpperCase();
    if (normalized === 'SEM MOVIMENTO') return 'NO_MOVEMENT';
    if (['INATIVO', 'INATIVA', 'ENCERRADO', 'ENCERRADA'].includes(normalized))
      return 'NO';
    return 'YES';
  }

  private parseMoney(raw: any): number | null {
    if (raw === null || raw === undefined || String(raw).trim() === '')
      return null;
    const parsed = parseFloat(
      String(raw).replace('R$', '').replace(/\./g, '').replace(',', '.').trim(),
    );
    return isNaN(parsed) ? null : parsed;
  }

  private parseIntOrNull(raw: any): number | null {
    if (raw === null || raw === undefined || String(raw).trim() === '')
      return null;
    const digits = String(raw).replace(/\D/g, '');
    if (!digits) return null;
    const parsed = parseInt(digits, 10);
    return isNaN(parsed) ? null : parsed;
  }

  private parseDate(raw: any): Date | null {
    if (!raw) return null;
    if (raw instanceof Date) return raw;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  // Colunas booleanas do template (Sim/Não) — usado pelos drivers descritivos
  // que alimentam o Agente de IA de complexidade (hasSpecialRegime,
  // frequentAdmissions). Ausência de célula não vira "Não": fica undefined,
  // pra não sobrescrever um valor já cadastrado por engano.
  private parseBoolYesNo(raw: any): boolean | undefined {
    if (raw === null || raw === undefined || String(raw).trim() === '')
      return undefined;
    const normalized = String(raw).trim().toUpperCase();
    if (['SIM', 'YES', 'TRUE', '1'].includes(normalized)) return true;
    if (['NÃO', 'NAO', 'NO', 'FALSE', '0'].includes(normalized)) return false;
    return undefined;
  }

  async importClientsJson(
    tenantId: string,
    records: any[],
    cycleId?: string,
    fileName?: string,
    startRow?: number,
    fiscalRows?: RawRow[],
    contabilRows?: RawRow[],
    pessoalRows?: RawRow[],
  ) {
    const prisma = this.getTenantPrisma(tenantId);
    let count = 0;
    const errors: string[] = [];
    const warnings: string[] = [];
    const fileLabel = fileName || 'arquivo importado';
    // Linha 1 da planilha é o cabeçalho; startRow é a linha real da 1ª
    // entrada deste lote (o frontend manda em lotes — sem isso, a linha
    // reportada em erro bateria só com a posição dentro do lote).
    const baseRow = startRow ?? 2;

    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
    });
    const getEmployeeId = (name: string) => {
      if (!name || String(name).trim() === '') return null;
      const e = employees.find((emp) =>
        emp.name.toLowerCase().includes(String(name).toLowerCase().trim()),
      );
      return e ? e.id : null;
    };

    const fronts = await prisma.operationalFront.findMany({
      where: { status: 'ACTIVE' },
    });
    // Nome da frente é texto livre por tenant (ex.: "DP/Pessoal", "Departamento
    // Pessoal", "RH" em vez de "Pessoal" — caso real do tenant do Gabriel
    // Resende, onde a comparação exata usada antes nunca casava e a frente
    // Pessoal inteira ficava sem ClientCycleSnapshot, silenciosamente).
    // Mesma heurística de categorização já usada em
    // FrontClassificationForm.tsx no frontend, só que na direção inversa
    // (aqui buscamos a frente a partir da chave, lá a chave a partir do nome).
    const FRONT_NAME_HINTS: Record<'fiscal' | 'contabil' | 'pessoal', string[]> = {
      fiscal: ['fiscal', 'tribut'],
      contabil: ['contábil', 'contabil', 'contabilidade'],
      pessoal: ['dp', 'pessoal', 'rh', 'humanos'],
    };
    const getFront = (key: 'fiscal' | 'contabil' | 'pessoal') => {
      const hints = FRONT_NAME_HINTS[key];
      return fronts.find((f) => {
        const name = f.name.toLowerCase().trim();
        return hints.some((hint) => name.includes(hint));
      });
    };

    // Aba única por CNPJ/CPF — indexa as 3 abas de frente pelo documento
    // normalizado (só dígitos) pra casar com 01_Clientes independente de
    // pontuação (12.345.678/0001-90 vs 12345678000190).
    const indexByDoc = (rows: RawRow[] | undefined) => {
      const map = new Map<string, RawRow>();
      for (const row of rows || []) {
        const doc = this.normalizeDoc(this.getVal(row, ['CNPJ/CPF', 'CNPJ', 'CPF']));
        if (doc) map.set(doc, row);
      }
      return map;
    };
    const fiscalByDoc = indexByDoc(fiscalRows);
    const contabilByDoc = indexByDoc(contabilRows);
    const pessoalByDoc = indexByDoc(pessoalRows);

    for (let rowIndex = 0; rowIndex < records.length; rowIndex++) {
      const row = records[rowIndex];
      const rowNumber = baseRow + rowIndex;
      const getVal = (keys: string[]) => this.getVal(row, keys);

      const name = getVal(['Razão social/Nome', 'Razão Social', 'Razao Social', 'name', 'Nome']);
      if (!name) continue;

      const docRaw = getVal(['CNPJ/CPF', 'CNPJ', 'CPF', 'cnpj']);
      const doc = this.normalizeDoc(docRaw);
      const personType = (() => {
        const raw = getVal(['Tipo pessoa']);
        if (!raw) return null;
        const normalized = String(raw).trim().toUpperCase();
        if (normalized === 'PJ') return 'PJ';
        if (normalized.includes('DOM') || normalized === 'PF') return 'PF_DOMESTICA';
        return normalized;
      })();

      const tradeName = getVal(['Nome fantasia', 'nomeFantasia', 'tradeName', 'Fantasia']);
      const statusVal = this.normalizeStatus(getVal(['Status contrato', 'Status', 'status']));
      const revenueBracket = getVal(['Faixa faturamento anual', 'Faixa de Faturamento']) || null;
      const monthlyFee = this.parseMoney(getVal(['Honorário faturado', 'Honorários']));
      const classification = getVal(['Classificação A-D', 'Classificação', 'classificacao']) || null;
      const entryDate = this.parseDate(getVal(['Data entrada']));
      const exitDate = this.parseDate(getVal(['Data saída']));

      // O template MVP REV03 não tem mais Regime Tributário no 01_Clientes —
      // ele agora é preenchido por frente (02_Fiscal / 03_Contabil). Mantém
      // Client.taxRegime populado (usado na listagem da carteira) puxando da
      // frente Fiscal, com fallback pra Contábil quando só ela existir.
      const fiscalRowForRegime = doc ? fiscalByDoc.get(doc) : undefined;
      const contabilRowForRegime = doc ? contabilByDoc.get(doc) : undefined;
      const taxRegime =
        (fiscalRowForRegime && this.getVal(fiscalRowForRegime, ['Regime tributário'])) ||
        (contabilRowForRegime && this.getVal(contabilRowForRegime, ['Regime tributário'])) ||
        null;

      const clientData: any = {
        name,
        tradeName: tradeName || null,
        status: statusVal,
        revenueBracket,
        monthlyFee,
        classification,
      };
      if (taxRegime) clientData.taxRegime = taxRegime;
      if (personType) clientData.personType = personType;
      if (entryDate) clientData.entryDate = entryDate;
      if (exitDate) clientData.exitDate = exitDate;

      let client = docRaw
        ? await prisma.client.findUnique({ where: { cnpj: String(docRaw) } })
        : null;

      if (client) {
        client = await prisma.client.update({ where: { id: client.id }, data: clientData });
      } else {
        client = await prisma.client.create({
          data: { ...clientData, cnpj: docRaw ? String(docRaw) : null },
        });
      }

      const processFront = async (
        key: 'fiscal' | 'contabil' | 'pessoal',
        areaRow: RawRow | undefined,
      ) => {
        if (!areaRow) return; // sem linha nesta aba nesta competência: frente não avaliada
        const displayName = FRONT_DISPLAY_NAME[key];
        const front = getFront(key);
        if (!front) {
          warnings.push(
            `${fileLabel}, linha ${rowNumber}: cliente "${name}" tem dados na aba de ${displayName}, mas o escritório não tem nenhuma frente ativa cujo nome pareça com "${displayName}" (ex.: "Fiscal", "Contábil", "DP/Pessoal") — cadastre essa frente em Estrutura para os dados aparecerem na carteira.`,
          );
          return;
        }

        const getArea = (keys: string[]) => this.getVal(areaRow, keys);
        const hasAreaCol = (keys: string[]) => this.hasCol(areaRow, keys);

        const actsInFront = this.statusFrenteToActsInFront(
          getArea(['Status da frente']),
        );

        let classificationRecord =
          await prisma.clientFrontClassification.findUnique({
            where: {
              clientId_frontId: { clientId: client.id, frontId: front.id },
            },
          });

        const operator1Id = getEmployeeId(getArea(['Responsável principal']));
        const operator2Id = getEmployeeId(getArea(['Responsável secundário']));

        let rowHasInvalidNote = false;
        const parseNote = (label: string, keys: string[]): number | null => {
          if (!hasAreaCol(keys)) return null; // coluna ausente: não é erro
          const raw = getArea(keys);
          if (raw === null || raw === undefined || String(raw).trim() === '')
            return null; // coluna existe, célula vazia: critério ausente
          const parsed = parseInt(String(raw).trim(), 10);
          if (isNaN(parsed) || parsed < 1 || parsed > 3) {
            errors.push(
              `${fileLabel}, linha ${rowNumber}, campo "${displayName} - ${label}": valor "${raw}" inválido — a nota deve ser 1, 2 ou 3.`,
            );
            rowHasInvalidNote = true;
            return null;
          }
          return parsed;
        };

        // Pessoal: Nota Volume nunca é lida da planilha — é sempre calculada
        // a partir do Total de Vínculos (template MVP REV03, 07_Regras:
        // "Regra versionada", nunca editável diretamente).
        let scoreVolume: number | null;
        let totalVinculos: number | null = null;
        if (key === 'pessoal') {
          const funcionarios = this.parseIntOrNull(getArea(['Qtd. Funcionários']));
          const prolabores = this.parseIntOrNull(getArea(['Qtd. Pró-labores']));
          const domesticas = this.parseIntOrNull(getArea(['Qtd. Domésticas']));
          if (funcionarios !== null || prolabores !== null || domesticas !== null) {
            totalVinculos = (funcionarios || 0) + (prolabores || 0) + (domesticas || 0);
          }
          scoreVolume =
            totalVinculos === null
              ? null
              : this.complexityService.calculateVolumeScore({
                  front: 'PESSOAL',
                  driverValue: totalVinculos,
                }).scoreVolume;
        } else {
          scoreVolume = parseNote('Nota Volume', ['Nota Volume']);
        }

        const scoreService = parseNote('Nota Atendimento', ['Nota Atendimento']);
        const scoreOrganization = parseNote('Nota Organização', ['Nota Organização']);
        const scoreTax = key === 'pessoal' ? null : parseNote('Nota Tributação', ['Nota Tributação']);
        const scoreTurnover = key === 'pessoal' ? parseNote('Nota Rotatividade', ['Nota Rotatividade']) : null;

        if (rowHasInvalidNote) return;

        const scores: CriteriaScores = {
          scoreVolume,
          scoreService,
          scoreTax,
          scoreOrganization,
          scoreTurnover,
        };

        const assessment: EvaluateComplexityResult = this.complexityService.evaluate({
          front: FRONT_TYPE[key],
          actsInFront,
          clientStatus: clientData.status,
          scores,
        });

        const data: any = {
          actsInFront,
          operator1Id,
          operator2Id,
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

        // Perfil operacional descritivo (categorias canônicas do template) —
        // gravado à parte, nunca influencia o cálculo de complexidade.
        if (key === 'fiscal') {
          // hasSpecialRegime/automationLevel/meetsDeadlines: colunas ainda
          // não confirmadas no template real do cliente — se ausentes na
          // planilha, getArea/parseBoolYesNo retornam undefined e o upsert
          // simplesmente não altera o campo. São os drivers objetivos que o
          // Agente de IA de complexidade usa pra sugerir Tributação e
          // Organização (ver backend/src/complexity-ai).
          await prisma.clientTaxInfo.upsert({
            where: { classificationId: classificationRecord.id },
            update: {
              documentReceiptMethod: getArea(['Forma recebimento documentos']) || undefined,
              documentSendMethod: getArea(['Forma envio documentos']) || undefined,
              integrationMethod: getArea(['Forma integração']) || undefined,
              hasSpecialRegime: this.parseBoolYesNo(getArea(['Possui regime especial'])),
              specialRegimeDescription:
                getArea(['Descrição do regime especial']) || undefined,
              automationLevel: getArea(['Nível de automação da apuração']) || undefined,
              meetsDeadlines: getArea(['Cumpre prazos de envio']) || undefined,
            },
            create: {
              classificationId: classificationRecord.id,
              documentReceiptMethod: getArea(['Forma recebimento documentos']) || null,
              documentSendMethod: getArea(['Forma envio documentos']) || null,
              integrationMethod: getArea(['Forma integração']) || null,
              hasSpecialRegime:
                this.parseBoolYesNo(getArea(['Possui regime especial'])) ?? false,
              specialRegimeDescription:
                getArea(['Descrição do regime especial']) || null,
              automationLevel: getArea(['Nível de automação da apuração']) || null,
              meetsDeadlines: getArea(['Cumpre prazos de envio']) || null,
            },
          });
        }
        if (key === 'contabil') {
          // bookkeepingRegime/infoReceiptFrequency/integrationLevel/
          // lastClosingMonth/trialBalanceNeed: mesmo caso do Fiscal acima —
          // drivers para Tributação/Organização, ausentes no template atual.
          await prisma.clientAccountingInfo.upsert({
            where: { classificationId: classificationRecord.id },
            update: {
              documentReceiptMethod: getArea(['Forma recebimento documentos']) || undefined,
              documentSendMethod: getArea(['Forma envio documentos']) || undefined,
              integrationMethod: getArea(['Forma integração']) || undefined,
              launchMethod: getArea(['Forma de lançamento']) || undefined,
              closingPeriod: getArea(['Periodicidade de Fechamento']) || undefined,
              lastReconciliationMonth: getArea(['Último Mês de Conciliação']) || undefined,
              bookkeepingRegime: getArea(['Regime de escrituração']) || undefined,
              lastClosingMonth: getArea(['Último mês de fechamento contábil']) || undefined,
              infoReceiptFrequency:
                getArea(['Frequência de recebimento de informação financeira']) || undefined,
              integrationLevel: getArea(['Integração com cliente']) || undefined,
              trialBalanceNeed:
                getArea(['Necessidade de apresentação de balancete']) || undefined,
            },
            create: {
              classificationId: classificationRecord.id,
              documentReceiptMethod: getArea(['Forma recebimento documentos']) || null,
              documentSendMethod: getArea(['Forma envio documentos']) || null,
              integrationMethod: getArea(['Forma integração']) || null,
              launchMethod: getArea(['Forma de lançamento']) || null,
              closingPeriod: getArea(['Periodicidade de Fechamento']) || null,
              lastReconciliationMonth: getArea(['Último Mês de Conciliação']) || null,
              bookkeepingRegime: getArea(['Regime de escrituração']) || null,
              lastClosingMonth: getArea(['Último mês de fechamento contábil']) || null,
              infoReceiptFrequency:
                getArea(['Frequência de recebimento de informação financeira']) || null,
              integrationLevel: getArea(['Integração com cliente']) || null,
              trialBalanceNeed:
                getArea(['Necessidade de apresentação de balancete']) || null,
            },
          });
        }
        if (key === 'pessoal') {
          // processingType/frequentAdmissions: driver objetivo de
          // Rotatividade (Sim/Não), ainda não confirmado no template real.
          await prisma.clientHrInfo.upsert({
            where: { classificationId: classificationRecord.id },
            update: {
              employeesCount: this.parseIntOrNull(getArea(['Qtd. Funcionários'])) ?? undefined,
              prolaboreCount: this.parseIntOrNull(getArea(['Qtd. Pró-labores'])) ?? undefined,
              domesticsCount: this.parseIntOrNull(getArea(['Qtd. Domésticas'])) ?? undefined,
              documentReceiptMethod: getArea(['Recebimento documentos']) || undefined,
              variablesLaunchMethod: getArea(['Recebimento variáveis']) || undefined,
              pointReceiptMethod: getArea(['Recebimento ponto']) || undefined,
              sheetSendingMethod: getArea(['Envio documentos']) || undefined,
              processingType: getArea(['Tipo de processamento']) || undefined,
              frequentAdmissions: this.parseBoolYesNo(
                getArea(['Admissões e rescisões frequentes']),
              ),
            },
            create: {
              classificationId: classificationRecord.id,
              employeesCount: this.parseIntOrNull(getArea(['Qtd. Funcionários'])),
              prolaboreCount: this.parseIntOrNull(getArea(['Qtd. Pró-labores'])),
              domesticsCount: this.parseIntOrNull(getArea(['Qtd. Domésticas'])),
              documentReceiptMethod: getArea(['Recebimento documentos']) || null,
              variablesLaunchMethod: getArea(['Recebimento variáveis']) || null,
              pointReceiptMethod: getArea(['Recebimento ponto']) || null,
              sheetSendingMethod: getArea(['Envio documentos']) || null,
              processingType: getArea(['Tipo de processamento']) || null,
              frequentAdmissions:
                this.parseBoolYesNo(getArea(['Admissões e rescisões frequentes'])) ?? false,
            },
          });
        }

        if (cycleId) {
          const existingSnapshot = await prisma.clientCycleSnapshot.findFirst({
            where: { clientId: client.id, cycleId, frontId: front.id },
          });
          if (!existingSnapshot) {
            await prisma.clientCycleSnapshot.create({
              data: {
                clientId: client.id,
                cycleId,
                frontId: front.id,
                monthlyFee: clientData.monthlyFee,
                classification: clientData.classification,
                scoreVolume: scores.scoreVolume,
                scoreService: scores.scoreService,
                scoreTax: scores.scoreTax,
                scoreOrganization: scores.scoreOrganization,
                scoreTurnover: scores.scoreTurnover,
                rawSum: assessment.rawSum,
                normalizedScore: assessment.normalizedScore,
                complexityClass: assessment.complexityClass,
                assessmentState: assessment.assessmentState,
                primaryOwnerId: operator1Id,
                secondaryOwnerId: operator2Id,
              },
            });
          }
        }
      };

      const fiscalRow = doc ? fiscalByDoc.get(doc) : undefined;
      const contabilRow = doc ? contabilByDoc.get(doc) : undefined;
      const pessoalRow = doc ? pessoalByDoc.get(doc) : undefined;

      await processFront('fiscal', fiscalRow);
      await processFront('contabil', contabilRow);
      await processFront('pessoal', pessoalRow);

      // Sem nenhuma linha correspondente nas 3 abas de frente, o cliente é
      // criado/atualizado normalmente na base, mas NENHUM ClientCycleSnapshot
      // é gerado (processFront não faz nada sem areaRow) — ele fica invisível
      // na Carteira do Ciclo, que lista só por snapshot. Avisa explicitamente
      // em vez de deixar isso passar como sucesso silencioso.
      if (cycleId && !fiscalRow && !contabilRow && !pessoalRow) {
        warnings.push(
          `${fileLabel}, linha ${rowNumber}: cliente "${name}" foi cadastrado na base, mas não aparecerá na carteira deste ciclo — não há nenhuma linha para o CNPJ/CPF "${docRaw ?? ''}" nas abas 02_Fiscal, 03_Contabil ou 04_Pessoal. Adicione ao menos uma linha em uma dessas abas para vincular o cliente a uma frente.`,
        );
      }

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
