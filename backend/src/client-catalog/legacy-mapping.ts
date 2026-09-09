// Tradução dos valores de texto livre já gravados para os códigos do
// catálogo (ORDEM-02, Bloco F).
//
// Escrito contra os valores que REALMENTE existem no banco, levantados em
// 09/09/2026 nos 9 escritórios — não contra o que o template supõe que
// exista. Funções puras: quem grava é o script de backfill.
//
// Princípio: quando o valor legado não determina o código com segurança, a
// função devolve AMBIGUO em vez de escolher. Chutar aqui injetaria uma nota
// errada num índice que vai redistribuir carteira e reorganizar agenda.

export type MappingOutcome =
  | { status: 'MAPEADO'; code: string }
  | { status: 'VAZIO' }
  | { status: 'AMBIGUO'; reason: string; candidates: string[] }
  | { status: 'DESCONHECIDO'; reason: string };

function norm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function isBlank(value: unknown): boolean {
  return value == null || String(value).trim() === '';
}

// --------------------------------------------------------------------------
// Regime tributário — compõe a Natureza do Cliente no Fiscal e no Contábil
// --------------------------------------------------------------------------
// Valores reais: "Simples Nacional" (66), "Lucro Presumido" (28),
// "Lucro Real" (11), mais as variantes já em código.
export function mapTaxRegime(value: unknown): MappingOutcome {
  if (isBlank(value)) return { status: 'VAZIO' };
  const v = norm(String(value));

  if (v.includes('simples')) return { status: 'MAPEADO', code: 'SIMPLES' };
  if (v.includes('presumido'))
    return { status: 'MAPEADO', code: 'LUCRO_PRESUMIDO' };
  if (v.includes('real')) return { status: 'MAPEADO', code: 'LUCRO_REAL' };
  if (v.includes('imune') || v.includes('isent'))
    return { status: 'MAPEADO', code: 'IMUNE_OU_ISENTA' };
  if (v.includes('especial'))
    return { status: 'MAPEADO', code: 'REGIME_ESPECIAL' };
  if (v.includes('mei'))
    return {
      status: 'AMBIGUO',
      reason: 'MEI não tem opção própria no template',
      candidates: ['SIMPLES'],
    };

  return { status: 'DESCONHECIDO', reason: `regime não reconhecido: ${value}` };
}

// --------------------------------------------------------------------------
// Segmento — cadastral, não pontua
// --------------------------------------------------------------------------
// Os valores legados são versões curtas das categorias do template
// ("Tecnologia" para "Tecnologia e Comunicação"). Como não entra no cálculo,
// um mapeamento por aproximação aqui não contamina índice nenhum.
const SEGMENT_TERMS: { code: string; terms: string[] }[] = [
  { code: 'AGRONEGOCIO', terms: ['agro', 'rural', 'pecuar', 'agricult'] },
  {
    code: 'ALIMENTACAO_HOTELARIA_E_TURISMO',
    terms: ['aliment', 'restaurante', 'hotel', 'turis', 'bar'],
  },
  {
    code: 'COMERCIO_E_DISTRIBUICAO',
    terms: ['comercio', 'varejo', 'atacado', 'distribui', 'e-commerce'],
  },
  {
    code: 'CONSTRUCAO_E_MERCADO_IMOBILIARIO',
    terms: ['constru', 'imobili', 'incorpora', 'engenharia'],
  },
  { code: 'EDUCACAO', terms: ['educa', 'ensino', 'escola', 'curso'] },
  {
    code: 'ENTIDADES_CONDOMINIOS_E_TERCEIRO_SETOR',
    terms: ['condomin', 'associa', 'igreja', 'sindicato', 'terceiro setor', 'ong'],
  },
  {
    code: 'FINANCEIRO_SEGUROS_E_INVESTIMENTOS',
    terms: ['financ', 'seguro', 'investi', 'credito', 'factoring'],
  },
  { code: 'HOLDINGS_E_PATRIMONIAL', terms: ['holding', 'patrimoni'] },
  { code: 'INDUSTRIA', terms: ['industri', 'fabrica', 'manufatur'] },
  { code: 'SAUDE_E_BEM_ESTAR', terms: ['saude', 'clinic', 'odonto', 'estetic', 'medic'] },
  {
    code: 'TECNOLOGIA_E_COMUNICACAO',
    terms: ['tecnolog', 'software', 'telecom', 'midia', 'comunica', 'ti'],
  },
  {
    code: 'TRANSPORTE_E_LOGISTICA',
    terms: ['transporte', 'logistic', 'armazen', 'entrega', 'frete'],
  },
  // Serviços fica por último de propósito: é o termo mais genérico e
  // capturaria "serviços de tecnologia", "serviços de saúde" etc.
  {
    code: 'SERVICOS_EMPRESARIAIS_E_PROFISSIONAIS',
    terms: ['servico', 'consultoria', 'juridic', 'advocacia', 'contabil'],
  },
];

function matchesTerm(text: string, term: string): boolean {
  if (term.length > 3) return text.includes(term);
  // Termo curto ("ti", "ong") so casa como palavra inteira. Sem isso
  // "logistica" casaria com "ti" e viraria Tecnologia. Quebrar em palavras
  // evita depender de escape de fronteira dentro de template literal, onde
  // a barra-b vira backspace e o casamento silenciosamente nunca acontece.
  return text.split(/[^a-z0-9]+/).includes(term);
}

export function mapSegment(value: unknown): MappingOutcome {
  if (isBlank(value)) return { status: 'VAZIO' };
  const v = norm(String(value));
  for (const { code, terms } of SEGMENT_TERMS) {
    if (terms.some((t) => matchesTerm(v, t))) return { status: 'MAPEADO', code };
  }
  return { status: 'MAPEADO', code: 'OUTROS' };
}

// --------------------------------------------------------------------------
// Faixa de faturamento — compõe a Natureza do Cliente
// --------------------------------------------------------------------------
// AQUI MORA O RISCO. As faixas legadas são MENSAIS e as do template são
// ANUAIS. Converter multiplicando por 12 faz várias faixas mensais caírem em
// cima de duas faixas anuais ao mesmo tempo, e não há como saber em qual o
// cliente está sem olhar o faturamento real.
//
// Só mapeamos as faixas cujo intervalo anual cabe INTEIRO dentro de uma única
// faixa do template. As demais viram AMBIGUO e vão para revisão humana —
// esta característica pontua, e um palpite viraria índice errado.
const ANNUAL_BANDS: { code: string; min: number; max: number }[] = [
  { code: 'ATE_R_360_MIL', min: 0, max: 360_000 },
  { code: 'R_360_MIL_1_2_MI', min: 360_000, max: 1_200_000 },
  { code: 'R_1_2_4_8_MI', min: 1_200_000, max: 4_800_000 },
  { code: 'R_4_8_20_MI', min: 4_800_000, max: 20_000_000 },
  { code: 'R_20_78_MI', min: 20_000_000, max: 78_000_000 },
  { code: 'ACIMA_DE_R_78_MI', min: 78_000_000, max: Infinity },
];

export function bandForAnnual(value: number): string {
  const band = ANNUAL_BANDS.find((b) => value <= b.max);
  return band ? band.code : 'ACIMA_DE_R_78_MI';
}

// Faixas mensais que aparecem na base, com o intervalo anual correspondente.
const LEGACY_MONTHLY: { match: string; minY: number; maxY: number }[] = [
  { match: 'ate r$ 100 mil/mes', minY: 0, maxY: 1_200_000 },
  { match: 'r$ 100 mil a r$ 300 mil/mes', minY: 1_200_000, maxY: 3_600_000 },
  { match: 'r$ 300 mil a r$ 700 mil/mes', minY: 3_600_000, maxY: 8_400_000 },
  { match: 'r$ 700 mil a r$ 1,5 mi/mes', minY: 8_400_000, maxY: 18_000_000 },
  { match: 'acima de r$ 1,5 mi/mes', minY: 18_000_000, maxY: Infinity },
];

export function mapRevenueBracket(value: unknown): MappingOutcome {
  if (isBlank(value)) return { status: 'VAZIO' };
  const raw = String(value).trim();
  const v = norm(raw);

  // Valor já no formato do template.
  const direct = ANNUAL_BANDS.find(
    (b) =>
      norm(b.code.replace(/_/g, ' ')) === v ||
      norm(b.code) === norm(raw.replace(/[^A-Za-z0-9]/g, '_')),
  );
  if (direct) return { status: 'MAPEADO', code: direct.code };
  if (v.includes('1,2') && v.includes('4,8'))
    return { status: 'MAPEADO', code: 'R_1_2_4_8_MI' };
  if (v.includes('360 mil') && v.includes('1,2'))
    return { status: 'MAPEADO', code: 'R_360_MIL_1_2_MI' };

  // Número solto: sem unidade declarada, não dá para saber se é mensal ou
  // anual. "90000" pode ser 90 mil por mês (1,08 mi/ano) ou 90 mil por ano.
  if (/^\d+([.,]\d+)?$/.test(v.replace(/\s/g, ''))) {
    const n = Number(v.replace(',', '.'));
    return {
      status: 'AMBIGUO',
      reason: `valor numérico sem unidade (${raw}): pode ser mensal ou anual`,
      candidates: [bandForAnnual(n), bandForAnnual(n * 12)],
    };
  }

  const monthly = LEGACY_MONTHLY.find((m) => v === m.match || v.includes(m.match));
  if (monthly) {
    const low = bandForAnnual(monthly.minY + 1);
    const high = bandForAnnual(
      monthly.maxY === Infinity ? 100_000_000 : monthly.maxY,
    );
    if (low === high) return { status: 'MAPEADO', code: low };
    return {
      status: 'AMBIGUO',
      reason: `faixa mensal "${raw}" atravessa mais de uma faixa anual do template`,
      candidates: [low, high],
    };
  }

  return {
    status: 'DESCONHECIDO',
    reason: `faixa de faturamento não reconhecida: ${raw}`,
  };
}

// --------------------------------------------------------------------------
// Status do contrato
// --------------------------------------------------------------------------
export function mapStatus(value: unknown): MappingOutcome {
  if (isBlank(value)) return { status: 'VAZIO' };
  const v = norm(String(value));
  if (v.startsWith('inativ')) return { status: 'MAPEADO', code: 'INATIVA' };
  if (v === 'inactive') return { status: 'MAPEADO', code: 'INATIVA' };
  if (v.includes('sem movimento') || v === 'no_movement')
    return { status: 'MAPEADO', code: 'SEM_MOVIMENTO' };
  if (v.startsWith('ativ') || v === 'active')
    return { status: 'MAPEADO', code: 'ATIVO' };
  return { status: 'DESCONHECIDO', reason: `status não reconhecido: ${value}` };
}

// --------------------------------------------------------------------------
// Perfil do cliente — compõe a Natureza nas três frentes
// --------------------------------------------------------------------------
export function mapProfileType(
  personType: unknown,
  document?: unknown,
): MappingOutcome {
  if (!isBlank(personType)) {
    const v = norm(String(personType));
    if (v.includes('domestic'))
      return { status: 'MAPEADO', code: 'EMPREGADOR_DOMESTICO' };
    if (v.includes('rural'))
      return { status: 'MAPEADO', code: 'PRODUTOR_RURAL_PF' };
    if (v === 'pj' || v.includes('juridic'))
      return { status: 'MAPEADO', code: 'EMPRESA_PJ' };
    if (v === 'pf' || v.includes('fisica'))
      return { status: 'MAPEADO', code: 'PESSOA_FISICA' };
  }

  // Sem personType, o tamanho do documento distingue PJ de PF, mas não
  // distingue Pessoa Física de Produtor Rural nem de Empregador Doméstico —
  // e essas três têm notas diferentes no Fiscal. Só o CNPJ é conclusivo.
  const digits = String(document ?? '').replace(/\D/g, '');
  if (digits.length === 14) return { status: 'MAPEADO', code: 'EMPRESA_PJ' };
  if (digits.length === 11)
    return {
      status: 'AMBIGUO',
      reason: 'CPF não distingue pessoa física, produtor rural e doméstico',
      candidates: ['PESSOA_FISICA', 'PRODUTOR_RURAL_PF', 'EMPREGADOR_DOMESTICO'],
    };

  return { status: 'VAZIO' };
}

// --------------------------------------------------------------------------
// Campos operacionais das frentes
// --------------------------------------------------------------------------
// Estes já foram gravados com os rótulos do template ("Portal", "E-mail",
// "Automática/API"), então o casamento é por rótulo, direto contra as opções
// do catálogo. Só 3 clientes na base inteira têm esses campos preenchidos.
export function mapByLabel(
  value: unknown,
  options: { value: string; label: string }[],
): MappingOutcome {
  if (isBlank(value)) return { status: 'VAZIO' };
  const v = norm(String(value));
  const hit = options.find(
    (o) => norm(o.label) === v || norm(o.value.replace(/_/g, ' ')) === v,
  );
  if (hit) return { status: 'MAPEADO', code: hit.value };
  return { status: 'DESCONHECIDO', reason: `opção não reconhecida: ${value}` };
}
