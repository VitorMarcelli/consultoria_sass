'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';

export type ComplexityFront = 'FISCAL' | 'CONTABIL' | 'PESSOAL';
export type CatalogBlock = 'MESTRE' | ComplexityFront;

export interface CatalogOption {
  value: string;
  label: string;
  cc?: Partial<Record<ComplexityFront, number>>;
  co?: Partial<Record<ComplexityFront, number>>;
  notApplicable?: boolean;
}

export interface CatalogField {
  key: string;
  number: number;
  block: CatalogBlock;
  label: string;
  type: 'TEXTO' | 'LISTA' | 'MASCARA' | 'SWITCH' | 'RELACAO' | 'RESULTADO';
  role: 'CADASTRO' | 'ELEGIBILIDADE' | 'CC' | 'CO' | 'AMBOS' | 'INSUMO';
  pillar?: string;
  fronts: ComplexityFront[];
  options?: CatalogOption[];
}

interface CatalogBlockData {
  block: CatalogBlock;
  fields: CatalogField[];
}

interface CatalogResponse {
  source: { file: string; generatedAt: string };
  blocks: CatalogBlockData[];
}

// O catálogo é estático e igual para todos os escritórios, então uma cópia em
// memória por sessão basta — não faz sentido rebuscar a cada abertura de modal.
let cache: CatalogResponse | null = null;
let inFlight: Promise<CatalogResponse> | null = null;

async function fetchCatalog(): Promise<CatalogResponse> {
  if (cache) return cache;
  if (!inFlight) {
    inFlight = apiRequest('/client-catalog')
      .then((data: CatalogResponse) => {
        cache = data;
        return data;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export function useClientCatalog() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(cache);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cache) return;
    let alive = true;
    fetchCatalog()
      .then((data) => {
        if (alive) setCatalog(data);
      })
      .catch((err) => {
        if (alive) setError(err?.message || 'Falha ao carregar o catálogo.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const fieldsOf = (block: CatalogBlock): CatalogField[] =>
    catalog?.blocks.find((b) => b.block === block)?.fields ?? [];

  return { catalog, loading, error, fieldsOf };
}

// Campos que o formulário renderiza. Ficam de fora os que já têm campo próprio
// na tela de identificação (razão social, CNPJ, honorário...) e os que o
// sistema resolve sozinho — o ciclo vem da rota, os responsáveis têm seletor
// de equipe, e o Total de Vínculos é calculado.
const HANDLED_ELSEWHERE = new Set([
  'MESTRE__DATA_DE_INICIO_OPERACAO',
  'MESTRE__CICLO_AAAA_MM',
  'MESTRE__CNPJ_CPF',
  'MESTRE__RAZAO_SOCIAL_NOME',
  'MESTRE__NOME_FANTASIA',
  'MESTRE__HONORARIO_FATURADO',
  'MESTRE__FISCAL',
  'MESTRE__CONTABIL',
  'MESTRE__PESSOAL',
]);

export function isRenderableField(field: CatalogField): boolean {
  if (HANDLED_ELSEWHERE.has(field.key)) return false;
  if (field.type === 'RELACAO') return false; // seletor de equipe próprio
  if (field.type === 'RESULTADO') return false; // calculado
  return true;
}

// Um campo pontua complexidade? Usado para destacar na tela o que muda o
// índice — o consultor precisa saber onde a resposta dele tem consequência.
export function isScoring(field: CatalogField): boolean {
  return field.role === 'CC' || field.role === 'CO' || field.role === 'AMBOS';
}

export function roleLabel(field: CatalogField): string | null {
  switch (field.role) {
    case 'CC':
      return 'Natureza do cliente';
    case 'CO':
      return 'Maturidade da operação';
    case 'AMBOS':
      return 'Natureza e maturidade';
    default:
      return null;
  }
}
