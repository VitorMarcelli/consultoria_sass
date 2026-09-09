// Motor CC/CO — funções puras, sem Prisma, sem injeção, sem I/O.
// O service orquestra; este arquivo só calcula (mesmo padrão de
// complexity.rules.ts, que continua servindo o motor antigo de 1..3).
//
// Regras conforme docs/ORDEM-02 §4.1 (decisões da reunião de 09/09/2026) e
// a aba "Lógica da Complexidade" do template do cliente.
//
// Dois índices independentes por frente, escala 1..5:
//   CC — Complexidade do Cliente ....... o que o cliente é (natureza)
//   CO — Complexidade Operacional ...... como o trabalho é feito (maturidade)
//
// O par CC-CO é a leitura de negócio: 5-1 é cliente pesado bem operado,
// 1-5 é cliente simples mal operado. Reduzir a um número só apagaria isso.

import {
  CatalogField,
  CatalogOption,
  ComplexityFront,
} from '../client-catalog/client-catalog.types';
import {
  CATALOG_FIELDS,
  LINK_COUNT_BANDS,
} from '../client-catalog/client-catalog.data';

export type ComplexityClass = 'C0' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5';

// Estado da avaliação de uma frente. Diferente do motor antigo, aqui não
// existe IMPORTED/AI_SUGGESTED: esses são atributos de procedência do dado,
// não do cálculo, e ficam a cargo de quem persiste.
export type IndexState =
  | 'INACTIVE' // frente não contratada ou cliente sem movimento
  | 'NOT_ASSESSED' // nenhuma resposta aplicável preenchida
  | 'PARTIAL' // faltam respostas aplicáveis
  | 'ASSESSED'; // todas as aplicáveis respondidas

// Régua de classes definida pelo cliente em 09/09/2026. O índice é sempre
// exibido com uma casa decimal; a classe é a faixa em que ele cai. Decimal e
// classe convivem — não era escolher um.
//
// Nota: com frentes inativas fora do cálculo e toda nota valendo no mínimo 1,
// a média nunca dá 0 nem cai entre 0,1 e 0,9. Na prática C0 deixa de ser
// resultado de cálculo e vira o rótulo do estado "sem frente ativa", e C1
// começa efetivamente em 1,0. A faixa está aqui como a régua foi definida.
const CLASS_BANDS: { max: number; label: ComplexityClass }[] = [
  { max: 0, label: 'C0' },
  { max: 1.4, label: 'C1' },
  { max: 2.4, label: 'C2' },
  { max: 3.4, label: 'C3' },
  { max: 4.4, label: 'C4' },
  { max: 5, label: 'C5' },
];

// Uma casa decimal, meio-para-cima. O `+ Number.EPSILON` evita que 2.45 vire
// 2.4 por representação binária.
export function round1(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function classifyIndex(value: number | null): ComplexityClass | null {
  if (value == null) return null;
  const band = CLASS_BANDS.find((b) => value <= b.max);
  return band ? band.label : 'C5';
}

// Converte o Total de Vínculos (funcionários + pró-labores + domésticas) na
// nota de volume da frente Pessoal. Faixas definidas na planilha, campo 43.
// Zero vínculos não tem faixa no template — devolve null em vez de assumir 1,
// para não inventar nota (pendente de definição do cliente).
export function scoreFromLinkCount(total: number | null): number | null {
  if (total == null || total <= 0) return null;
  const band = LINK_COUNT_BANDS.find((b) => total <= b.max);
  return band ? band.score : null;
}

function optionOf(
  field: CatalogField,
  value: string | null | undefined,
): CatalogOption | null {
  if (!value || !field.options) return null;
  return field.options.find((o) => o.value === value) ?? null;
}

function scoresFor(
  field: CatalogField,
  front: ComplexityFront,
  kind: 'cc' | 'co',
): boolean {
  if (!field.fronts.includes(front)) return false;
  if (kind === 'cc' && field.role !== 'CC' && field.role !== 'AMBOS')
    return false;
  if (kind === 'co' && field.role !== 'CO' && field.role !== 'AMBOS')
    return false;
  // Campo calculado (Total de Vínculos) não tem lista de opções: a nota sai
  // de uma tabela de faixas, não de uma escolha. Conta assim mesmo.
  if (field.type === 'RESULTADO') return true;
  // Nos demais, o campo só conta se alguma opção tiver nota naquela frente.
  // Protege contra campo marcado com o papel certo mas sem nota preenchida.
  return (field.options ?? []).some((o) => (o[kind] ?? {})[front] != null);
}

// Campos que compõem cada índice numa frente. Exportado porque o formulário
// precisa saber quais perguntas fazer e quantas faltam.
export function fieldsForIndex(
  front: ComplexityFront,
  kind: 'cc' | 'co',
  catalog: CatalogField[] = CATALOG_FIELDS,
): CatalogField[] {
  return catalog.filter((f) => scoresFor(f, front, kind));
}

export interface FrontAssessmentInput {
  front: ComplexityFront;
  // Frente contratada E cliente com movimento no ciclo. Falso aqui significa
  // que a frente não entra em nenhuma média — não é zero, é ausência
  // (decisão de 09/09/2026).
  active: boolean;
  // Respostas por chave de campo do catálogo. Ausente ou null = não respondido.
  answers: Record<string, string | null | undefined>;
  // Total de Vínculos da frente Pessoal, quando aplicável.
  linkCount?: number | null;
}

export interface IndexResult {
  value: number | null;
  class: ComplexityClass | null;
  state: IndexState;
  answered: number;
  applicable: number;
  // Campos aplicáveis ainda sem resposta — é o que a tela mostra como
  // pendência, em vez de exibir um número que vai mudar.
  missing: string[];
}

export interface FrontAssessmentResult {
  front: ComplexityFront;
  active: boolean;
  cc: IndexResult;
  co: IndexResult;
  // Par exibido ao usuário, ex: "3,6-2,4". Null enquanto algum lado não fechou.
  pair: string | null;
}

const TOTAL_LINKS_KEY = 'PESSOAL__TOTAL_DE_VINCULOS';

function emptyIndex(state: IndexState): IndexResult {
  return {
    value: null,
    class: state === 'INACTIVE' ? 'C0' : null,
    state,
    answered: 0,
    applicable: 0,
    missing: [],
  };
}

function computeIndex(
  input: FrontAssessmentInput,
  kind: 'cc' | 'co',
  catalog: CatalogField[],
): IndexResult {
  if (!input.active) return emptyIndex('INACTIVE');

  const fields = fieldsForIndex(input.front, kind, catalog);
  const scores: number[] = [];
  const missing: string[] = [];
  let applicable = 0;

  for (const field of fields) {
    // Total de Vínculos é calculado, não escolhido numa lista.
    if (field.key === TOTAL_LINKS_KEY) {
      applicable += 1;
      const score = scoreFromLinkCount(input.linkCount ?? null);
      if (score == null) missing.push(field.key);
      else scores.push(score);
      continue;
    }

    const answer = input.answers[field.key];
    if (answer == null || answer === '') {
      applicable += 1;
      missing.push(field.key);
      continue;
    }

    const option = optionOf(field, answer);
    // Resposta que não existe no catálogo é tratada como ausente, nunca como
    // nota zero — chutar aqui contaminaria a média silenciosamente.
    if (!option) {
      applicable += 1;
      missing.push(field.key);
      continue;
    }

    // "Não se aplica": sai do numerador E do denominador. Por isso não
    // incrementa `applicable`.
    if (option.notApplicable) continue;

    const score = (option[kind] ?? {})[input.front];
    if (score == null) continue;

    applicable += 1;
    scores.push(score);
  }

  const answered = scores.length;

  if (applicable === 0) {
    // Todas as etapas marcadas como "não se aplica": não há o que medir.
    return { ...emptyIndex('NOT_ASSESSED'), applicable: 0 };
  }
  if (answered === 0) {
    return { ...emptyIndex('NOT_ASSESSED'), applicable, missing };
  }
  if (missing.length > 0) {
    // Deliberadamente NÃO calcula a média parcial: um número que muda quando
    // a última resposta chega é pior que a ausência declarada. Mesmo
    // princípio da ORDEM-01 — nunca assumir nota.
    return {
      value: null,
      class: null,
      state: 'PARTIAL',
      answered,
      applicable,
      missing,
    };
  }

  const value = round1(scores.reduce((a, b) => a + b, 0) / scores.length);
  return {
    value,
    class: classifyIndex(value),
    state: 'ASSESSED',
    answered,
    applicable,
    missing: [],
  };
}

function formatPair(cc: IndexResult, co: IndexResult): string | null {
  if (cc.value == null || co.value == null) return null;
  const fmt = (v: number) => v.toFixed(1).replace('.', ',');
  return `${fmt(cc.value)}-${fmt(co.value)}`;
}

export function assessFront(
  input: FrontAssessmentInput,
  catalog: CatalogField[] = CATALOG_FIELDS,
): FrontAssessmentResult {
  const cc = computeIndex(input, 'cc', catalog);
  const co = computeIndex(input, 'co', catalog);
  return {
    front: input.front,
    active: input.active,
    cc,
    co,
    pair: formatPair(cc, co),
  };
}

// ---------------------------------------------------------------------------
// Agregação
// ---------------------------------------------------------------------------
// Todos os níveis seguem a mesma regra: só entra na média o registro de uma
// frente ATIVA com índice fechado. Frente inativa não é zero, é ausência —
// e frente com avaliação incompleta não tem número para entrar.

export interface AggregateResult {
  cc: number | null;
  co: number | null;
  ccClass: ComplexityClass | null;
  coClass: ComplexityClass | null;
  pair: string | null;
  // Base de cálculo, para a tela poder declarar sobre o que está falando.
  consideredCC: number;
  consideredCO: number;
  activeCount: number;
  inactiveCount: number;
  pendingCount: number;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return round1(values.reduce((a, b) => a + b, 0) / values.length);
}

function aggregate(
  records: { active: boolean; cc: number | null; co: number | null }[],
): AggregateResult {
  const active = records.filter((r) => r.active);
  const ccValues = active
    .map((r) => r.cc)
    .filter((v): v is number => v != null);
  const coValues = active
    .map((r) => r.co)
    .filter((v): v is number => v != null);

  const cc = average(ccValues);
  const co = average(coValues);
  const fmt = (v: number) => v.toFixed(1).replace('.', ',');

  return {
    cc,
    co,
    ccClass: classifyIndex(cc),
    coClass: classifyIndex(co),
    pair: cc != null && co != null ? `${fmt(cc)}-${fmt(co)}` : null,
    consideredCC: ccValues.length,
    consideredCO: coValues.length,
    activeCount: active.length,
    inactiveCount: records.length - active.length,
    pendingCount: active.filter((r) => r.cc == null || r.co == null).length,
  };
}

// Consolidado do cliente: média das frentes em que ele é atendido. Uma frente
// não contratada não puxa o índice para baixo — era exatamente o defeito do
// exemplo original da planilha, em que um cliente saía com 2,0 quando o
// correto era 3,0.
export function assessClient(fronts: FrontAssessmentResult[]): AggregateResult {
  return aggregate(
    fronts.map((f) => ({
      active: f.active,
      cc: f.cc.value,
      co: f.co.value,
    })),
  );
}

export interface PortfolioRecord {
  active: boolean;
  cc: number | null;
  co: number | null;
}

// Carteira de uma frente, ou do escritório inteiro. Segue a planilha: a média
// é sobre as observações cliente-frente (pool), não a média das médias de
// cada área — com carteiras de tamanhos diferentes por frente os dois
// resultados divergem, e o pool é o que a aba de lógica calcula.
export function assessPortfolio(records: PortfolioRecord[]): AggregateResult {
  return aggregate(records);
}
