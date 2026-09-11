// Tradução de uma linha de planilha para as respostas do catálogo.
//
// Funções puras: recebem a linha crua e os campos do catálogo, devolvem as
// respostas em código mais os avisos. Quem grava é o imports.service.
//
// Serve as duas planilhas que circulam hoje:
//
//   - o template novo (Sistema - Base de Cadastro de Clientes), cujas colunas
//     têm exatamente os rótulos do catálogo e cujas células trazem os rótulos
//     das opções ("Plataforma integrada", "Baixo", "Lucro Real");
//   - o template antigo MVP REV03, que usa notas numéricas de 1 a 3 nos
//     campos de percepção e texto livre no regime e na faixa de faturamento.
//
// Nada é adivinhado: valor que não casa com nenhuma opção vira aviso e a
// resposta fica em branco. Uma nota errada aqui redistribui carteira e
// reorganiza agenda — é pior que uma resposta faltando, que ao menos aparece
// como pendência no indicador de mapeamento.

import {
  CatalogField,
  CatalogOption,
  ComplexityFront,
} from '../client-catalog/client-catalog.types';
import {
  mapProfileType,
  mapRevenueBracket,
  mapSegment,
  mapStatus,
  mapTaxRegime,
  MappingOutcome,
} from '../client-catalog/legacy-mapping';

export type RawRow = Record<string, any>;

export interface ImportedAnswers {
  answers: Record<string, string>;
  warnings: string[];
}

function norm(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function isBlank(value: unknown): boolean {
  return value == null || String(value).trim() === '';
}

// Procura a coluna pelo rótulo do campo do catálogo, aceitando apelidos.
// Comparação sem acento e sem caixa porque planilha preenchida à mão varia
// em ambos.
export function readCell(row: RawRow, labels: string[]): unknown {
  const alvo = labels.map(norm);
  const chave = Object.keys(row).find((k) => alvo.includes(norm(k)));
  return chave ? row[chave] : undefined;
}

export function hasColumn(row: RawRow, labels: string[]): boolean {
  const alvo = labels.map(norm);
  return Object.keys(row).some((k) => alvo.includes(norm(k)));
}

// Notas numéricas do template antigo (1 a 3) para as opções do novo.
//
// Os campos de percepção do catálogo têm exatamente três opções, pontuando
// 1, 3 e 5. A escala antiga ia de 1 a 3 com o mesmo significado ordinal, e
// por isso a conversão é posicional: 1 vira a primeira opção, 2 a do meio,
// 3 a última. Só se aplica quando o campo tem três opções — em qualquer
// outro caso o número não tem tradução conhecida e vira aviso.
function optionFromLegacyNote(
  field: CatalogField,
  nota: number,
): CatalogOption | null {
  const opcoes = (field.options ?? []).filter((o) => !o.notApplicable);
  if (opcoes.length !== 3) return null;
  if (nota < 1 || nota > 3) return null;
  return opcoes[nota - 1];
}

function optionByLabel(
  field: CatalogField,
  value: unknown,
): CatalogOption | null {
  const v = norm(value);
  return (
    (field.options ?? []).find(
      (o) => norm(o.label) === v || norm(o.value.replace(/_/g, ' ')) === v,
    ) ?? null
  );
}

// Campos do bloco MESTRE que têm tradutor próprio, porque o valor legado não
// é o rótulo da opção (regime vem como "Simples Nacional", faixa vem em
// valores mensais, status vem como ACTIVE).
const MASTER_TRANSLATORS: Record<
  string,
  (row: RawRow, labels: string[]) => MappingOutcome
> = {
  MESTRE__REGIME_TRIBUTARIO: (row, labels) =>
    mapTaxRegime(readCell(row, labels)),
  MESTRE__SEGMENTO: (row, labels) => mapSegment(readCell(row, labels)),
  MESTRE__FAIXA_FATURAMENTO_ANUAL: (row, labels) =>
    mapRevenueBracket(readCell(row, labels)),
  MESTRE__STATUS_CONTRATO: (row, labels) => mapStatus(readCell(row, labels)),
};

// Apelidos de coluna do template antigo para os campos do catálogo.
const COLUMN_ALIASES: Record<string, string[]> = {
  MESTRE__STATUS_CONTRATO: ['Status', 'Status do cliente'],
  MESTRE__FAIXA_FATURAMENTO_ANUAL: ['Faixa faturamento', 'Faixa de faturamento'],
  MESTRE__CLASSIFICACAO_A_D: ['Classificação', 'Classificacao'],
  MESTRE__PERFIL_DO_CLIENTE: ['Tipo pessoa', 'Perfil'],
};

function labelsFor(field: CatalogField): string[] {
  return [field.label, ...(COLUMN_ALIASES[field.key] ?? [])];
}

interface TranslateOptions {
  // Identificação da linha para as mensagens de aviso.
  origem: string;
  // Documento, usado para desempatar o perfil quando a coluna não existe.
  documento?: string | null;
}

function traduzirCampo(
  field: CatalogField,
  row: RawRow,
  answers: Record<string, string>,
  warnings: string[],
  opts: TranslateOptions,
) {
  const labels = labelsFor(field);

  // Campos com tradutor próprio.
  const tradutor = MASTER_TRANSLATORS[field.key];
  if (tradutor) {
    if (!hasColumn(row, labels)) return;
    const r = tradutor(row, labels);
    if (r.status === 'MAPEADO') answers[field.key] = r.code;
    else if (r.status === 'AMBIGUO')
      warnings.push(
        `${opts.origem}, campo "${field.label}": ${r.reason}. A resposta ficou em branco para ser preenchida na tela.`,
      );
    else if (r.status === 'DESCONHECIDO')
      warnings.push(`${opts.origem}, campo "${field.label}": ${r.reason}.`);
    return;
  }

  if (field.key === 'MESTRE__PERFIL_DO_CLIENTE') {
    // O template novo traz o rótulo exato da opção ("Empresa – PJ"), que o
    // tradutor legado não reconhece porque ele espera "PJ" ou "PF". Tentar o
    // catálogo primeiro evita cair no desempate por documento à toa.
    const bruto = readCell(row, labels);
    const direto = optionByLabel(field, bruto);
    if (direto) {
      answers[field.key] = direto.value;
      return;
    }
    const r = mapProfileType(bruto, opts.documento);
    if (r.status === 'MAPEADO') answers[field.key] = r.code;
    else if (r.status === 'AMBIGUO')
      warnings.push(
        `${opts.origem}, campo "Perfil do Cliente": ${r.reason}. Defina o perfil na ficha do cliente.`,
      );
    return;
  }

  if (!hasColumn(row, labels)) return; // coluna ausente não é erro
  const bruto = readCell(row, labels);
  if (isBlank(bruto)) return; // célula vazia: resposta simplesmente falta

  if (field.type === 'MASCARA') {
    const n = Number(String(bruto).replace(',', '.'));
    if (Number.isFinite(n)) answers[field.key] = String(n);
    return;
  }

  if (field.type !== 'LISTA') {
    answers[field.key] = String(bruto).trim();
    return;
  }

  // Lista: primeiro tenta casar pelo rótulo da opção (template novo).
  const porRotulo = optionByLabel(field, bruto);
  if (porRotulo) {
    answers[field.key] = porRotulo.value;
    return;
  }

  // Depois, nota numérica do template antigo.
  const numero = Number(String(bruto).trim());
  if (Number.isInteger(numero)) {
    const convertida = optionFromLegacyNote(field, numero);
    if (convertida) {
      answers[field.key] = convertida.value;
      return;
    }
    warnings.push(
      `${opts.origem}, campo "${field.label}": a nota "${bruto}" não tem correspondência nas opções deste campo. A resposta ficou em branco.`,
    );
    return;
  }

  warnings.push(
    `${opts.origem}, campo "${field.label}": valor "${bruto}" não corresponde a nenhuma opção. A resposta ficou em branco.`,
  );
}

// Traduz o bloco MESTRE de uma linha de 01_Clientes.
export function translateMasterRow(
  row: RawRow,
  fields: CatalogField[],
  opts: TranslateOptions,
): ImportedAnswers {
  const answers: Record<string, string> = {};
  const warnings: string[] = [];
  for (const field of fields) {
    if (field.block !== 'MESTRE') continue;
    if (field.role === 'CADASTRO' && !MASTER_TRANSLATORS[field.key]) {
      // Campos puramente cadastrais que já têm coluna própria no banco
      // (nome, CNPJ, honorário) continuam sendo gravados pelo importador da
      // forma antiga; não precisam virar resposta de catálogo.
      if (field.type !== 'LISTA') continue;
    }
    traduzirCampo(field, row, answers, warnings, opts);
  }
  return { answers, warnings };
}

// Traduz o bloco de uma frente, de 02_Fiscal / 03_Contabil / 04_Pessoal.
export function translateFrontRow(
  row: RawRow,
  fields: CatalogField[],
  front: ComplexityFront,
  opts: TranslateOptions,
): ImportedAnswers {
  const answers: Record<string, string> = {};
  const warnings: string[] = [];
  for (const field of fields) {
    if (field.block !== front) continue;
    if (field.type === 'RELACAO' || field.type === 'RESULTADO') continue;
    traduzirCampo(field, row, answers, warnings, opts);
  }
  return { answers, warnings };
}
