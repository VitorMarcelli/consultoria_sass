// Layout de coluna única: um cliente por linha, todas as frentes na mesma aba.
//
// O template que circulava até aqui (MVP REV03) separava os dados em quatro
// abas — 01_Clientes mais uma por frente — casadas por CNPJ/CPF. Funciona, mas
// obriga quem preenche a repetir o documento em quatro lugares e a manter as
// abas sincronizadas; um CNPJ digitado diferente numa delas fazia a frente
// inteira desaparecer da importação sem que ninguém percebesse.
//
// No layout novo a planilha é uma tabela só: as colunas do bloco MESTRE vêm
// sem prefixo e as de frente vêm prefixadas — "Fiscal | Nota Volume",
// "Contábil | Forma de lançamento", "Pessoal | Qtd. Funcionários".
//
// Este módulo é puro: recebe a linha crua e devolve a linha do cliente mais
// uma linha por frente, no mesmo formato que as abas produziam. Assim o resto
// do importador não precisa saber em qual dos dois layouts o arquivo veio.

import {
  CatalogField,
  ComplexityFront,
  COMPLEXITY_FRONTS,
} from '../client-catalog/client-catalog.types';

export type RawRow = Record<string, any>;

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

// Como a frente aparece no prefixo da coluna. Inclui os apelidos que os
// escritórios usam de fato no nome da frente ("DP", "RH"), porque quem monta a
// planilha copia o nome que vê no sistema.
const PREFIXOS: Record<ComplexityFront, string[]> = {
  FISCAL: ['fiscal'],
  CONTABIL: ['contabil', 'contabilidade'],
  PESSOAL: [
    'pessoal',
    'dp',
    'dp/pessoal',
    'pessoal/dp',
    'rh',
    'departamento pessoal',
  ],
};

// Separadores aceitos entre a frente e o campo. O hífen entra na lista porque
// é o que sai naturalmente de quem digita à mão ("Fiscal - Nota Volume"), e
// não gera ambiguidade: a coluna só é tratada como prefixada quando o texto
// antes do separador é o nome de uma frente. "Classificação A-D" continua
// sendo campo do MESTRE.
const SEPARADORES = ['|', ':', '>', '/', '-', '–', '—'];

interface Prefixo {
  front: ComplexityFront;
  campo: string;
}

// Reconhece "Fiscal | Nota Volume" como { FISCAL, 'Nota Volume' }.
export function parsePrefix(coluna: string): Prefixo | null {
  const bruto = String(coluna ?? '');
  for (const sep of SEPARADORES) {
    const pos = bruto.indexOf(sep);
    if (pos <= 0) continue;
    const antes = norm(bruto.slice(0, pos));
    const depois = bruto.slice(pos + sep.length).trim();
    if (!depois) continue;
    const front = COMPLEXITY_FRONTS.find((f) => PREFIXOS[f].includes(antes));
    if (front) return { front, campo: depois };
  }
  return null;
}

// Rótulos que existem em uma única frente do catálogo e em nenhum campo do
// MESTRE — esses podem vir sem prefixo sem gerar ambiguidade ("Qtd.
// Funcionários" só existe no Pessoal). Os que se repetem entre frentes
// ("Nota Atendimento", presente nas três) exigem prefixo: sem ele não há como
// saber de qual frente a resposta é, e adivinhar aqui seria pontuar a frente
// errada.
function rotulosExclusivos(
  fields: CatalogField[],
): Map<string, ComplexityFront> {
  const porRotulo = new Map<string, Set<string>>();
  for (const f of fields) {
    const chave = norm(f.label);
    if (!porRotulo.has(chave)) porRotulo.set(chave, new Set());
    porRotulo.get(chave)!.add(f.block);
  }
  const exclusivos = new Map<string, ComplexityFront>();
  for (const [rotulo, blocos] of porRotulo) {
    if (blocos.size !== 1) continue;
    const bloco = [...blocos][0];
    if (bloco === 'MESTRE') continue;
    exclusivos.set(rotulo, bloco as ComplexityFront);
  }
  return exclusivos;
}

// Coluna do MESTRE que declara se a frente está contratada (campos 13/14/15 do
// template). Quando ela responde "Não", a frente não é avaliada — e isso não é
// o mesmo que nota zero: frente fora do escopo sai do numerador e do
// denominador da complexidade.
const COLUNA_ESCOPO: Record<ComplexityFront, string[]> = {
  FISCAL: ['fiscal?', 'possui fiscal?', 'possui fiscal'],
  CONTABIL: ['contabil?', 'possui contabil?', 'possui contabil'],
  PESSOAL: ['pessoal?', 'possui pessoal?', 'possui pessoal', 'dp?'],
};

function lerEscopo(row: RawRow, front: ComplexityFront): boolean | null {
  const alvo = COLUNA_ESCOPO[front];
  const chave = Object.keys(row).find((k) => alvo.includes(norm(k)));
  if (!chave) return null;
  const v = row[chave];
  if (isBlank(v)) return null;
  const t = norm(v);
  if (['sim', 's', 'x', 'true', 'verdadeiro', '1', 'yes'].includes(t))
    return true;
  if (['nao', 'n', 'false', 'falso', '0', 'no', '-'].includes(t)) return false;
  return null;
}

export interface FlatSplit {
  // Linha do cliente, como se tivesse vindo de 01_Clientes.
  master: RawRow;
  // Uma linha por frente em escopo, como se tivesse vindo da aba da frente.
  // Frente ausente aqui significa frente não avaliada.
  fronts: Partial<Record<ComplexityFront, RawRow>>;
  // Verdadeiro quando a linha traz pelo menos uma coluna prefixada, ou seja,
  // quando o arquivo está no layout de coluna única.
  flat: boolean;
}

export function splitFlatRow(row: RawRow, fields: CatalogField[]): FlatSplit {
  const exclusivos = rotulosExclusivos(fields);
  const master: RawRow = {};
  const porFrente: Record<ComplexityFront, RawRow> = {
    FISCAL: {},
    CONTABIL: {},
    PESSOAL: {},
  };
  const comValor: Record<ComplexityFront, boolean> = {
    FISCAL: false,
    CONTABIL: false,
    PESSOAL: false,
  };
  let flat = false;

  for (const coluna of Object.keys(row)) {
    const valor = row[coluna];
    const prefixo = parsePrefix(coluna);

    if (prefixo) {
      flat = true;
      porFrente[prefixo.front][prefixo.campo] = valor;
      if (!isBlank(valor)) comValor[prefixo.front] = true;
      continue;
    }

    // Sem prefixo: é do cliente. Se o rótulo existir em uma única frente, vale
    // também como resposta daquela frente — a coluna continua no MESTRE porque
    // nenhum campo do cliente tem esse rótulo, então não há conflito.
    master[coluna] = valor;
    const exclusivo = exclusivos.get(norm(coluna));
    if (exclusivo) {
      porFrente[exclusivo][coluna] = valor;
      if (!isBlank(valor)) comValor[exclusivo] = true;
    }
  }

  // "Status da frente" sem prefixo vale para todas as frentes em escopo — é
  // como o template antigo trazia, uma coluna por aba.
  const statusGeral = Object.keys(master).find(
    (k) => norm(k) === 'status da frente',
  );

  const fronts: Partial<Record<ComplexityFront, RawRow>> = {};
  for (const front of COMPLEXITY_FRONTS) {
    const escopo = lerEscopo(row, front);
    if (escopo === false) continue; // declarada fora do escopo
    // Sem declaração de escopo, a frente só é avaliada se houver alguma
    // resposta dela na linha. Coluna vazia não inventa frente contratada.
    if (escopo === null && !comValor[front]) continue;
    const linha = porFrente[front];
    if (statusGeral && !('Status da frente' in linha)) {
      linha['Status da frente'] = master[statusGeral];
    }
    fronts[front] = linha;
  }

  return { master, fronts, flat };
}
