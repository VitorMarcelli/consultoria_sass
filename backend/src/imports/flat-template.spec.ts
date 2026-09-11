import { parsePrefix, splitFlatRow } from './flat-template';
import { CATALOG_FIELDS } from '../client-catalog/client-catalog.data';

describe('prefixo da coluna', () => {
  it('reconhece os separadores usados na prática', () => {
    expect(parsePrefix('Fiscal | Nota Volume')).toEqual({
      front: 'FISCAL',
      campo: 'Nota Volume',
    });
    expect(parsePrefix('Contábil - Forma de lançamento')).toEqual({
      front: 'CONTABIL',
      campo: 'Forma de lançamento',
    });
    expect(parsePrefix('PESSOAL: Qtd. Funcionários')).toEqual({
      front: 'PESSOAL',
      campo: 'Qtd. Funcionários',
    });
    expect(parsePrefix('DP | Nota Atendimento')).toEqual({
      front: 'PESSOAL',
      campo: 'Nota Atendimento',
    });
  });

  it('não confunde campo do cliente que tem hífen ou barra com prefixo', () => {
    // "Classificação A-D" e "Razão social/Nome" têm separador no meio, mas o
    // texto antes dele não é frente nenhuma — continuam sendo do MESTRE.
    expect(parsePrefix('Classificação A-D')).toBeNull();
    expect(parsePrefix('Razão social/Nome')).toBeNull();
    expect(parsePrefix('CNPJ/CPF')).toBeNull();
    expect(parsePrefix('Fiscal?')).toBeNull();
  });
});

describe('divisão da linha corrida', () => {
  const linha = {
    'CNPJ/CPF': '12.345.678/0001-99',
    'Razão social/Nome': 'ACME',
    'Regime tributário': 'Lucro Real',
    'Fiscal?': 'Sim',
    'Contábil?': 'Sim',
    'Pessoal?': 'Não',
    'Fiscal | Nota Volume': 'Alto',
    'Fiscal | Nota Organização': 'Baixa',
    'Contábil | Periodicidade de Fechamento': 'Mensal',
    'Pessoal | Qtd. Funcionários': 30,
  };

  it('separa o bloco do cliente das colunas de frente', () => {
    const { master, fronts, flat } = splitFlatRow(linha, CATALOG_FIELDS);
    expect(flat).toBe(true);
    expect(master['Regime tributário']).toBe('Lucro Real');
    expect(master['Fiscal | Nota Volume']).toBeUndefined();
    expect(fronts.FISCAL).toEqual({
      'Nota Volume': 'Alto',
      'Nota Organização': 'Baixa',
    });
    expect(fronts.CONTABIL).toEqual({
      'Periodicidade de Fechamento': 'Mensal',
    });
  });

  it('frente marcada como não contratada não é avaliada, mesmo com coluna preenchida', () => {
    // Frente fora do escopo é ausência, não zero: ela sai do numerador e do
    // denominador da complexidade. Avaliar por engano um Pessoal que o cliente
    // não contratou puxaria a média do escritório para baixo.
    const { fronts } = splitFlatRow(linha, CATALOG_FIELDS);
    expect(fronts.PESSOAL).toBeUndefined();
  });

  it('sem a coluna de escopo, a frente entra quando tem alguma resposta', () => {
    const { fronts } = splitFlatRow(
      { 'CNPJ/CPF': '1', 'Fiscal | Nota Volume': 'Médio' },
      CATALOG_FIELDS,
    );
    expect(fronts.FISCAL).toEqual({ 'Nota Volume': 'Médio' });
    expect(fronts.CONTABIL).toBeUndefined();
    expect(fronts.PESSOAL).toBeUndefined();
  });

  it('coluna de frente presente mas vazia não inventa frente contratada', () => {
    const { fronts } = splitFlatRow(
      { 'CNPJ/CPF': '1', 'Fiscal | Nota Volume': '' },
      CATALOG_FIELDS,
    );
    expect(fronts.FISCAL).toBeUndefined();
  });

  it('frente marcada como contratada entra mesmo sem nenhuma resposta', () => {
    // É o caso do cliente recém-contratado: a frente existe e precisa aparecer
    // como pendência de mapeamento, não desaparecer da carteira.
    const { fronts } = splitFlatRow(
      { 'CNPJ/CPF': '1', 'Fiscal?': 'Sim' },
      CATALOG_FIELDS,
    );
    expect(fronts.FISCAL).toEqual({});
  });

  it('rótulo exclusivo de uma frente é aceito sem prefixo', () => {
    // "Qtd. Funcionários" só existe no Pessoal — exigir prefixo aqui seria
    // rigor sem ganho. Já "Nota Atendimento" existe nas três frentes e por
    // isso continua exigindo prefixo.
    const { fronts } = splitFlatRow(
      { 'CNPJ/CPF': '1', 'Qtd. Funcionários': 5, 'Nota Atendimento': 'Alto' },
      CATALOG_FIELDS,
    );
    expect(fronts.PESSOAL).toEqual({ 'Qtd. Funcionários': 5 });
    expect(fronts.FISCAL).toBeUndefined();
    expect(fronts.CONTABIL).toBeUndefined();
  });

  it('planilha em abas não é tratada como coluna única', () => {
    const { fronts, flat } = splitFlatRow(
      { 'CNPJ/CPF': '1', 'Razão social/Nome': 'ACME', Segmento: 'Indústria' },
      CATALOG_FIELDS,
    );
    expect(flat).toBe(false);
    expect(fronts).toEqual({});
  });

  it('Status da frente sem prefixo vale para as frentes em escopo', () => {
    const { fronts } = splitFlatRow(
      {
        'CNPJ/CPF': '1',
        'Fiscal?': 'Sim',
        'Contábil?': 'Sim',
        'Status da frente': 'Sem movimento',
        'Contábil | Status da frente': 'Ativo',
      },
      CATALOG_FIELDS,
    );
    expect(fronts.FISCAL?.['Status da frente']).toBe('Sem movimento');
    // O valor prefixado é mais específico e não é sobrescrito pelo geral.
    expect(fronts.CONTABIL?.['Status da frente']).toBe('Ativo');
  });
});
