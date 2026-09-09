// Tipos do catálogo de domínios do cadastro de clientes (ORDEM-02, S1.2).
//
// O catálogo em si é gerado da planilha do cliente por
// docs/tools/gerar-catalogo-dominios.py — ver client-catalog.data.ts.
// Estes tipos são escritos à mão e podem evoluir.

export type ComplexityFront = 'FISCAL' | 'CONTABIL' | 'PESSOAL';

export const COMPLEXITY_FRONTS: ComplexityFront[] = [
  'FISCAL',
  'CONTABIL',
  'PESSOAL',
];

// Blocos do formulário. MESTRE é comum a todas as frentes; os demais só
// aparecem quando a frente correspondente está no escopo contratado.
export type CatalogBlock = 'MESTRE' | ComplexityFront;

export type CatalogFieldType =
  | 'TEXTO'
  | 'LISTA'
  | 'MASCARA'
  | 'SWITCH'
  | 'RELACAO'
  | 'RESULTADO';

// Papel do campo no cálculo:
//   CADASTRO      — informativo, não pontua
//   ELEGIBILIDADE — gatilho (status do contrato, frente contratada)
//   CC            — compõe a Complexidade do Cliente (natureza)
//   CO            — compõe a Complexidade Operacional (maturidade)
//   AMBOS         — compõe os dois (Atendimento, e Periodicidade no Contábil)
//   INSUMO        — alimenta um campo calculado, não pontua diretamente
export type CatalogFieldRole =
  | 'CADASTRO'
  | 'ELEGIBILIDADE'
  | 'CC'
  | 'CO'
  | 'AMBOS'
  | 'INSUMO';

export interface CatalogOption {
  value: string;
  label: string;
  // Notas por frente. Ausente na frente em que a opção não pontua.
  cc?: Partial<Record<ComplexityFront, number>>;
  co?: Partial<Record<ComplexityFront, number>>;
  // "Não se aplica" / "Não utiliza controle de ponto": a etapa não existe
  // para este cliente. Sai do numerador E do denominador da média — decisão
  // do cliente em 09/09/2026. Diferente de "Sem integração", que é um estado
  // real e ruim e por isso pontua 5.
  notApplicable?: boolean;
}

export interface CatalogField {
  key: string;
  number: number;
  block: CatalogBlock;
  label: string;
  type: CatalogFieldType;
  role: CatalogFieldRole;
  pillar?: string;
  fronts: ComplexityFront[];
  options?: CatalogOption[];
  // Marcado quando o papel do campo diverge do que a planilha declara, por
  // decisão registrada. Ver comentário no campo gerado.
  roleOverridesTemplate?: boolean;
}
