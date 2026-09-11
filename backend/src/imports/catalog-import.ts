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
// 1, 3 e 5. A escala antiga ia de 1 a 3 com o mesmo significado ordinal —
// quanto maior, mais complexo —, então a conversão é por NOTA, não por
// posição na lista.
//
// A diferença não é acadêmica. Em "Nota Organização" a escala do template é
// invertida: "Alta" organização pontua 1 e "Baixa" pontua 5, e as opções
// aparecem na ordem Baixa, Média, Alta. Converter pela posição faria a nota 1
// do template antigo (cliente organizado) virar "Baixa" — exatamente o
// oposto. Numa importação isso inverteria a Organização da carteira inteira,
// e a Maturidade da Operação sairia errada sem ninguém perceber.
function optionFromLegacyNote(
  field: CatalogField,
  front: ComplexityFront,
  nota: number,
): CatalogOption | null {
  if (nota < 1 || nota > 3) return null;

  const comNota = (field.options ?? [])
    .filter((o) => !o.notApplicable)
    .map((o) => ({
      opcao: o,
      score: (o.cc ?? {})[front] ?? (o.co ?? {})[front] ?? null,
    }))
    .filter((x): x is { opcao: CatalogOption; score: number } => x.score != null)
    .sort((a, b) => a.score - b.score);

  if (comNota.length !== 3) return null;
  return comNota[nota - 1].opcao;
}

// Competência (AAAA-MM) a partir do que a planilha entregar.
//
// O formulário guarda mês em AAAA-MM, que é o formato do <input type="month">.
// A planilha pode mandar isso de três jeitos: o texto pronto, uma data já
// convertida, ou — o caso que quebrou a importação de 11/09/2026 — o número de
// série do Excel, que conta dias desde 30/12/1899. Tratar tudo como número,
// como era feito antes, gravava "46235" onde a pessoa escreveu agosto/2026, e
// jogava fora qualquer competência digitada como texto.
export function parseCompetencia(bruto: unknown): string | null {
  if (isBlank(bruto)) return null;

  const doDate = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

  if (bruto instanceof Date) return doDate(bruto);

  const n = typeof bruto === 'number' ? bruto : Number(String(bruto).trim());
  if (Number.isFinite(n)) {
    // 20000 é 1954 e 60000 é 2064: dentro da faixa, é número de série do
    // Excel. Fora dela o número não é data — e aqui devolver nada é melhor
    // que seguir adiante, porque `new Date('3')` responde 2001 sem hesitar.
    if (n >= 20000 && n <= 60000) {
      return doDate(new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000));
    }
    return null;
  }

  const texto = String(bruto).trim();
  let m = texto.match(/^(\d{4})[-/](\d{1,2})$/); // 2026-08
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}`;
  m = texto.match(/^(\d{1,2})[-/](\d{4})$/); // 08/2026
  if (m) return `${m[2]}-${m[1].padStart(2, '0')}`;
  m = texto.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/); // 01/08/2026
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}`;

  const d = new Date(texto);
  return isNaN(d.getTime()) ? null : doDate(d);
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
  // Frente em tradução. Necessária para converter nota numérica do template
  // antigo, porque a pontuação de cada opção é definida por frente.
  front?: ComplexityFront;
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
    if (field.format === 'DATA') {
      const competencia = parseCompetencia(bruto);
      if (competencia) answers[field.key] = competencia;
      else
        warnings.push(
          `${opts.origem}, campo "${field.label}": não reconheci "${bruto}" como mês. Use o formato AAAA-MM.`,
        );
      return;
    }
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

  // Depois, nota numérica do template antigo. Precisa da frente porque a
  // nota de cada opção é por frente.
  const numero = Number(String(bruto).trim());
  if (Number.isInteger(numero) && opts.front) {
    const convertida = optionFromLegacyNote(field, opts.front, numero);
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
    traduzirCampo(field, row, answers, warnings, { ...opts, front });
  }
  return { answers, warnings };
}

// Caminho inverso de optionFromLegacyNote: da resposta do catálogo de volta
// para a nota de 1 a 3 do motor antigo.
//
// Os painéis antigos (Diagnóstico por critério, ClientFrontClassification.
// scoreVolume e companhia) continuam lendo essa escala. Enquanto o template
// trazia números, o importador só precisava copiar a célula; o template de
// coluna única traz o rótulo da opção ("Alto", "Média"), e sem esta conversão
// a nota antiga ficaria nula em toda importação — ou, pior, seria rejeitada
// como valor inválido e a frente inteira deixaria de ser gravada.
export function legacyNoteFromAnswers(
  fields: CatalogField[],
  front: ComplexityFront,
  label: string,
  answers: Record<string, string>,
): number | null {
  const alvo = norm(label);
  const field = fields.find(
    (f) => f.block === front && norm(f.label) === alvo,
  );
  if (!field) return null;

  const resposta = answers[field.key];
  if (!resposta) return null;

  const escolhida = (field.options ?? []).find((o) => o.value === resposta);
  if (!escolhida || escolhida.notApplicable) return null;

  const comNota = (field.options ?? [])
    .filter((o) => !o.notApplicable)
    .map((o) => ({
      opcao: o,
      score: (o.cc ?? {})[front] ?? (o.co ?? {})[front] ?? null,
    }))
    .filter((x): x is { opcao: CatalogOption; score: number } => x.score != null)
    .sort((a, b) => a.score - b.score);

  if (comNota.length !== 3) return null;
  const posicao = comNota.findIndex((x) => x.opcao.value === resposta);
  return posicao === -1 ? null : posicao + 1;
}
