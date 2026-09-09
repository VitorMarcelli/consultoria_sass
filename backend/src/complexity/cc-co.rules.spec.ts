import {
  assessClient,
  assessFront,
  assessPortfolio,
  classifyIndex,
  fieldsForIndex,
  round1,
  scoreFromLinkCount,
  FrontAssessmentResult,
} from './cc-co.rules';
import { CATALOG_FIELDS } from '../client-catalog/client-catalog.data';
import { CatalogField } from '../client-catalog/client-catalog.types';

// Atalho para montar um resultado de frente só com os números que a
// agregação enxerga — os testes de agregação não precisam do cadastro todo.
function frente(
  front: any,
  active: boolean,
  cc: number | null,
  co: number | null,
): FrontAssessmentResult {
  const idx = (v: number | null) => ({
    value: v,
    class: classifyIndex(v),
    state: (active ? (v == null ? 'PARTIAL' : 'ASSESSED') : 'INACTIVE') as any,
    answered: v == null ? 0 : 1,
    applicable: 1,
    missing: [] as string[],
  });
  return { front, active, cc: idx(cc), co: idx(co), pair: null };
}

describe('régua de classes (decisão de 09/09/2026)', () => {
  it('mapeia cada faixa para a classe correta', () => {
    expect(classifyIndex(0)).toBe('C0');
    expect(classifyIndex(0.1)).toBe('C1');
    expect(classifyIndex(1.4)).toBe('C1');
    expect(classifyIndex(1.5)).toBe('C2');
    expect(classifyIndex(2.4)).toBe('C2');
    expect(classifyIndex(2.5)).toBe('C3');
    expect(classifyIndex(3.4)).toBe('C3');
    expect(classifyIndex(3.5)).toBe('C4');
    expect(classifyIndex(4.4)).toBe('C4');
    expect(classifyIndex(4.5)).toBe('C5');
    expect(classifyIndex(5)).toBe('C5');
  });

  it('não classifica índice ausente', () => {
    expect(classifyIndex(null)).toBeNull();
  });

  it('arredonda para uma casa sem erro de ponto flutuante', () => {
    expect(round1(2.45)).toBe(2.5);
    expect(round1(2.6666666)).toBe(2.7);
    expect(round1(1.8333333)).toBe(1.8);
  });
});

describe('Total de Vínculos', () => {
  it('aplica as faixas do template', () => {
    expect(scoreFromLinkCount(1)).toBe(1);
    expect(scoreFromLinkCount(10)).toBe(1);
    expect(scoreFromLinkCount(11)).toBe(3);
    expect(scoreFromLinkCount(50)).toBe(3);
    expect(scoreFromLinkCount(51)).toBe(5);
    expect(scoreFromLinkCount(900)).toBe(5);
  });

  it('não inventa nota quando não há vínculo — o template não cobre o zero', () => {
    expect(scoreFromLinkCount(0)).toBeNull();
    expect(scoreFromLinkCount(null)).toBeNull();
  });
});

describe('composição dos índices (bate com a planilha)', () => {
  const conta = (front: any, kind: 'cc' | 'co') =>
    fieldsForIndex(front, kind).length;

  it('CC tem 5 campos no Fiscal, 6 no Contábil e 4 no Pessoal', () => {
    expect(conta('FISCAL', 'cc')).toBe(5);
    expect(conta('CONTABIL', 'cc')).toBe(6);
    expect(conta('PESSOAL', 'cc')).toBe(4);
  });

  it('CO tem 5 campos no Fiscal, 7 no Contábil e 5 no Pessoal', () => {
    expect(conta('FISCAL', 'co')).toBe(5);
    expect(conta('CONTABIL', 'co')).toBe(7);
    expect(conta('PESSOAL', 'co')).toBe(5);
  });

  it('Atendimento pontua nos dois índices, nas três frentes', () => {
    for (const front of ['FISCAL', 'CONTABIL', 'PESSOAL'] as const) {
      const emCC = fieldsForIndex(front, 'cc').some((f) =>
        f.label.includes('Atendimento'),
      );
      const emCO = fieldsForIndex(front, 'co').some((f) =>
        f.label.includes('Atendimento'),
      );
      expect(emCC).toBe(true);
      expect(emCO).toBe(true);
    }
  });

  it('Regime e Faixa de faturamento não se aplicam ao Pessoal', () => {
    const rotulos = fieldsForIndex('PESSOAL', 'cc').map((f) => f.label);
    expect(rotulos).not.toContain('Regime tributário');
    expect(rotulos).not.toContain('Faixa faturamento anual');
  });

  it('Rotatividade só existe no Pessoal', () => {
    expect(
      fieldsForIndex('PESSOAL', 'cc').some((f) =>
        f.label.includes('Rotatividade'),
      ),
    ).toBe(true);
    for (const front of ['FISCAL', 'CONTABIL'] as const) {
      expect(
        fieldsForIndex(front, 'cc').some((f) =>
          f.label.includes('Rotatividade'),
        ),
      ).toBe(false);
    }
  });

  it('campo 44 do Pessoal pontua CO, com a divergência marcada', () => {
    const campo = CATALOG_FIELDS.find((f) => f.number === 44) as CatalogField;
    expect(campo.role).toBe('CO');
    expect(campo.roleOverridesTemplate).toBe(true);
  });
});

// Catálogo mínimo e controlado, para testar a mecânica sem depender das
// dezenas de campos reais.
const CATALOGO_TESTE: CatalogField[] = [
  {
    key: 'T__A',
    number: 1,
    block: 'FISCAL',
    label: 'A',
    type: 'LISTA',
    role: 'CC',
    fronts: ['FISCAL'],
    options: [
      { value: 'BAIXO', label: 'Baixo', cc: { FISCAL: 1 } },
      { value: 'ALTO', label: 'Alto', cc: { FISCAL: 5 } },
    ],
  },
  {
    key: 'T__B',
    number: 2,
    block: 'FISCAL',
    label: 'B',
    type: 'LISTA',
    role: 'CC',
    fronts: ['FISCAL'],
    options: [
      { value: 'MEDIO', label: 'Médio', cc: { FISCAL: 3 } },
      { value: 'NA', label: 'Não se aplica', notApplicable: true },
    ],
  },
  {
    key: 'T__C',
    number: 3,
    block: 'FISCAL',
    label: 'C',
    type: 'LISTA',
    role: 'CO',
    fronts: ['FISCAL'],
    options: [
      { value: 'BOM', label: 'Bom', co: { FISCAL: 1 } },
      { value: 'RUIM', label: 'Ruim', co: { FISCAL: 5 } },
    ],
  },
];

describe('cálculo por frente', () => {
  const base = { front: 'FISCAL' as const, active: true };

  it('média simples das notas aplicáveis, com uma casa decimal', () => {
    const r = assessFront(
      { ...base, answers: { T__A: 'ALTO', T__B: 'MEDIO', T__C: 'RUIM' } },
      CATALOGO_TESTE,
    );
    expect(r.cc.value).toBe(4); // (5 + 3) / 2
    expect(r.cc.class).toBe('C4');
    expect(r.co.value).toBe(5);
    expect(r.pair).toBe('4,0-5,0');
  });

  it('"Não se aplica" sai do numerador e do denominador', () => {
    const r = assessFront(
      { ...base, answers: { T__A: 'ALTO', T__B: 'NA', T__C: 'BOM' } },
      CATALOGO_TESTE,
    );
    expect(r.cc.value).toBe(5); // só o campo A entra
    expect(r.cc.applicable).toBe(1);
    expect(r.cc.state).toBe('ASSESSED');
  });

  it('frente inativa não produz índice — é ausência, não zero', () => {
    const r = assessFront(
      { ...base, active: false, answers: { T__A: 'ALTO' } },
      CATALOGO_TESTE,
    );
    expect(r.cc.value).toBeNull();
    expect(r.co.value).toBeNull();
    expect(r.cc.state).toBe('INACTIVE');
    expect(r.cc.class).toBe('C0');
  });

  it('avaliação incompleta não devolve média parcial', () => {
    const r = assessFront(
      { ...base, answers: { T__A: 'ALTO', T__C: 'RUIM' } },
      CATALOGO_TESTE,
    );
    expect(r.cc.state).toBe('PARTIAL');
    expect(r.cc.value).toBeNull();
    expect(r.cc.missing).toEqual(['T__B']);
    expect(r.co.state).toBe('ASSESSED');
  });

  it('sem nenhuma resposta fica NOT_ASSESSED', () => {
    const r = assessFront({ ...base, answers: {} }, CATALOGO_TESTE);
    expect(r.cc.state).toBe('NOT_ASSESSED');
    expect(r.cc.applicable).toBe(2);
  });

  it('resposta fora do catálogo conta como ausente, nunca como zero', () => {
    const r = assessFront(
      { ...base, answers: { T__A: 'INEXISTENTE', T__B: 'MEDIO' } },
      CATALOGO_TESTE,
    );
    expect(r.cc.state).toBe('PARTIAL');
    expect(r.cc.missing).toContain('T__A');
  });

  it('tudo "não se aplica" não vira índice zero', () => {
    const r = assessFront(
      { ...base, answers: { T__B: 'NA' } },
      [CATALOGO_TESTE[1]],
    );
    expect(r.cc.value).toBeNull();
    expect(r.cc.applicable).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Exemplo da aba "Lógica da Complexidade", recalculado com as regras de
// 09/09/2026 (frente inativa fora do cálculo). Os números da planilha em si
// estão desatualizados — ver ORDEM-02 §4.1.
// ---------------------------------------------------------------------------
describe('exemplo da planilha, com as regras novas', () => {
  const fiscal: Record<string, [number, number] | null> = {
    A: [3, 2],
    B: [2, 5],
    C: null, // inativo no Fiscal
    D: [3, 4],
    E: [2, 2],
    F: [1, 1],
  };
  const contabil: Record<string, [number, number] | null> = {
    A: [2, 2],
    B: [3, 3],
    C: [4, 4],
    D: null, // inativo no Contábil
    E: [5, 2],
    F: [1, 1],
  };
  const pessoal: Record<string, [number, number] | null> = {
    A: [1, 2],
    B: [4, 4],
    C: [2, 5],
    D: [5, 1],
    E: [2, 1],
    F: [1, 5],
  };

  const comoRegistros = (m: Record<string, [number, number] | null>) =>
    Object.values(m).map((v) => ({
      active: v !== null,
      cc: v ? v[0] : null,
      co: v ? v[1] : null,
    }));

  it('carteira do Fiscal: 2,2 e 2,8 sobre 5 clientes (era 1,8 e 2,3 com zerados)', () => {
    const r = assessPortfolio(comoRegistros(fiscal));
    expect(r.cc).toBe(2.2);
    expect(r.co).toBe(2.8);
    expect(r.ccClass).toBe('C2');
    expect(r.coClass).toBe('C3');
    expect(r.consideredCC).toBe(5);
    expect(r.inactiveCount).toBe(1);
  });

  it('carteira do Contábil: 3,0 e 2,4 sobre 5 clientes', () => {
    const r = assessPortfolio(comoRegistros(contabil));
    expect(r.cc).toBe(3);
    expect(r.co).toBe(2.4);
    expect(r.consideredCC).toBe(5);
  });

  it('carteira do Pessoal: 2,5 e 3,0 sobre 6 clientes (não tinha zerado)', () => {
    const r = assessPortfolio(comoRegistros(pessoal));
    expect(r.cc).toBe(2.5);
    expect(r.co).toBe(3);
    expect(r.inactiveCount).toBe(0);
  });

  it('cliente C: frente não contratada deixa de puxar o índice para baixo', () => {
    // Era 2,0 quando o zero do Fiscal entrava na média. Passa a 3,0.
    const r = assessClient([
      frente('FISCAL', false, null, null),
      frente('CONTABIL', true, 4, 4),
      frente('PESSOAL', true, 2, 5),
    ]);
    expect(r.cc).toBe(3);
    expect(r.co).toBe(4.5);
    expect(r.pair).toBe('3,0-4,5');
    expect(r.activeCount).toBe(2);
    expect(r.inactiveCount).toBe(1);
  });

  it('cliente D: idem, com o Contábil ausente', () => {
    const r = assessClient([
      frente('FISCAL', true, 3, 4),
      frente('CONTABIL', false, null, null),
      frente('PESSOAL', true, 5, 1),
    ]);
    expect(r.cc).toBe(4);
    expect(r.co).toBe(2.5);
  });

  it('cliente E: arredonda 1,666 para 1,7', () => {
    const r = assessClient([
      frente('FISCAL', true, 2, 2),
      frente('CONTABIL', true, 5, 2),
      frente('PESSOAL', true, 2, 1),
    ]);
    expect(r.cc).toBe(3);
    expect(r.co).toBe(1.7);
  });

  it('carteira geral: pool das 16 observações ativas, não média das médias', () => {
    const todos = [
      ...comoRegistros(fiscal),
      ...comoRegistros(contabil),
      ...comoRegistros(pessoal),
    ];
    const r = assessPortfolio(todos);
    expect(r.cc).toBe(2.6);
    expect(r.co).toBe(2.8);
    expect(r.consideredCC).toBe(16);
    expect(r.inactiveCount).toBe(2);
  });
});

describe('agregação — base de cálculo declarada', () => {
  it('separa inativos de pendentes em vez de somar tudo', () => {
    const r = assessPortfolio([
      { active: true, cc: 3, co: 2 },
      { active: true, cc: null, co: null }, // avaliação incompleta
      { active: false, cc: null, co: null }, // frente inativa
    ]);
    expect(r.cc).toBe(3);
    expect(r.consideredCC).toBe(1);
    expect(r.activeCount).toBe(2);
    expect(r.pendingCount).toBe(1);
    expect(r.inactiveCount).toBe(1);
  });

  it('carteira sem nenhum registro avaliado devolve null, não zero', () => {
    const r = assessPortfolio([{ active: false, cc: null, co: null }]);
    expect(r.cc).toBeNull();
    expect(r.ccClass).toBeNull();
    expect(r.pair).toBeNull();
  });
});
