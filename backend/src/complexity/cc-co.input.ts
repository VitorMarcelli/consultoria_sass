// Montagem da entrada do motor CC/CO a partir dos registros do banco.
//
// Fica separado do service de propósito: é aqui que moram as decisões
// sutis (o que conta como frente ativa, de onde sai o Total de Vínculos,
// como as respostas do bloco MESTRE se juntam às da frente) e nenhuma delas
// precisa de Prisma para ser testada.

import { ComplexityFront } from '../client-catalog/client-catalog.types';
import { FrontAssessmentInput } from './cc-co.rules';

// Mapeia o nome livre da OperationalFront do escritório para a frente fixa
// que o motor conhece. O tenant nomeia como quiser ("DP", "Depto Pessoal",
// "Pessoal"), então a comparação é por aproximação, sem acento e em minúsculas
// — mesmo problema que o importador já resolvia por aproximação de nome.
const FRONT_ALIASES: { front: ComplexityFront; terms: string[] }[] = [
  { front: 'FISCAL', terms: ['fiscal', 'tributar', 'impost'] },
  { front: 'CONTABIL', terms: ['contab', 'contabil', 'escritur', 'societ'] },
  { front: 'PESSOAL', terms: ['pessoal', 'dp', 'folha', 'trabalhista', 'rh'] },
];

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // tira as marcas de acento
    .toLowerCase()
    .trim();
}

export function resolveFront(frontName?: string | null): ComplexityFront | null {
  if (!frontName) return null;
  const name = normalize(frontName);
  // "dp" precisa casar como palavra inteira, senão qualquer nome que contenha
  // essas duas letras cairia em Pessoal.
  for (const { front, terms } of FRONT_ALIASES) {
    for (const term of terms) {
      if (term === 'dp') {
        if (/\bdp\b/.test(name)) return front;
      } else if (name.includes(term)) {
        return front;
      }
    }
  }
  return null;
}

// Status de contrato que tiram o cliente do cálculo. Cobre tanto os códigos
// do template (ATIVO / SEM_MOVIMENTO / INATIVA) quanto os valores legados
// que já estão gravados (ACTIVE / INACTIVE), porque as duas convenções
// convivem até o Bloco F unificar.
const INACTIVE_STATUSES = new Set([
  'INACTIVE',
  'INATIVA',
  'INATIVO',
  'SEM_MOVIMENTO',
  'NO_MOVEMENT',
  'SEM MOVIMENTO',
]);

export function isClientActive(status?: string | null): boolean {
  if (!status) return true; // sem status gravado, presume ativo (default do schema)
  return !INACTIVE_STATUSES.has(status.toUpperCase().trim());
}

const LINK_KEYS = [
  'PESSOAL__QTD_FUNCIONARIOS',
  'PESSOAL__QTD_PRO_LABORES',
  'PESSOAL__QTD_DOMESTICAS',
];

function toNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Total de Vínculos = funcionários + pró-labores + domésticas.
//
// Prioriza as colunas de ClientHrInfo, que é onde o cadastro atual já grava,
// e cai nas respostas do catálogo quando elas não existirem. Devolve null
// quando não há NENHUMA das três informações — diferente de devolver 0, que
// significaria "cliente sem vínculo nenhum" e é outra coisa.
export function resolveLinkCount(
  hrInfo: {
    employeesCount?: number | null;
    prolaboreCount?: number | null;
    domesticsCount?: number | null;
  } | null | undefined,
  answers: Record<string, unknown>,
): number | null {
  const fromHr = [
    hrInfo?.employeesCount,
    hrInfo?.prolaboreCount,
    hrInfo?.domesticsCount,
  ].map(toNumber);

  const fromAnswers = LINK_KEYS.map((k) => toNumber(answers[k]));

  const parts = fromHr.map((v, i) => (v != null ? v : fromAnswers[i]));
  if (parts.every((v) => v == null)) return null;
  return parts.reduce((sum: number, v) => sum + (v ?? 0), 0);
}

export interface ClientLike {
  status?: string | null;
  profileType?: string | null;
  catalogAnswers?: unknown;
}

export interface ClassificationLike {
  actsInFront?: string | null;
  catalogAnswers?: unknown;
  hrInfo?: {
    employeesCount?: number | null;
    prolaboreCount?: number | null;
    domesticsCount?: number | null;
  } | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

// Junta as respostas do bloco MESTRE (que moram no Client) com as da frente
// (que moram na ClientFrontClassification). O CC precisa das duas: Perfil,
// Regime e Faixa de faturamento vêm do MESTRE, o resto vem da frente.
//
// `profileType` tem coluna própria no Client e, se preenchida, tem
// precedência sobre a resposta solta — é o campo canônico.
export function buildFrontInput(
  front: ComplexityFront,
  client: ClientLike,
  classification: ClassificationLike,
): FrontAssessmentInput {
  const answers: Record<string, string | null> = {};

  for (const [key, value] of Object.entries(asRecord(client.catalogAnswers))) {
    answers[key] = value == null ? null : String(value);
  }
  for (const [key, value] of Object.entries(
    asRecord(classification.catalogAnswers),
  )) {
    answers[key] = value == null ? null : String(value);
  }
  if (client.profileType) {
    answers['MESTRE__PERFIL_DO_CLIENTE'] = client.profileType;
  }

  const active =
    classification.actsInFront === 'YES' && isClientActive(client.status);

  return {
    front,
    active,
    answers,
    linkCount:
      front === 'PESSOAL'
        ? resolveLinkCount(classification.hrInfo, {
            ...asRecord(client.catalogAnswers),
            ...asRecord(classification.catalogAnswers),
          })
        : null,
  };
}
