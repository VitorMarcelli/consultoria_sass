import {
  hasColumn,
  readCell,
  translateFrontRow,
  translateMasterRow,
} from './catalog-import';
import { CATALOG_FIELDS } from '../client-catalog/client-catalog.data';

const origem = { origem: 'arquivo.xlsx, linha 2' };

describe('leitura de coluna', () => {
  const row = { 'Regime tributário': 'Lucro Real', 'Nome Fantasia': 'ACME' };

  it('casa o rótulo ignorando acento e caixa', () => {
    expect(readCell(row, ['regime tributario'])).toBe('Lucro Real');
    expect(readCell(row, ['NOME FANTASIA'])).toBe('ACME');
  });

  it('distingue coluna ausente de célula vazia', () => {
    expect(hasColumn(row, ['Regime tributário'])).toBe(true);
    expect(hasColumn(row, ['Segmento'])).toBe(false);
    expect(readCell(row, ['Segmento'])).toBeUndefined();
  });
});

describe('bloco MESTRE', () => {
  it('traduz os valores do template antigo para os códigos do catálogo', () => {
    const { answers, warnings } = translateMasterRow(
      {
        'Regime tributário': 'Simples Nacional',
        Segmento: 'Tecnologia',
        Status: 'ACTIVE',
        'Classificação A-D': 'B',
      },
      CATALOG_FIELDS,
      origem,
    );
    expect(answers['MESTRE__REGIME_TRIBUTARIO']).toBe('SIMPLES');
    expect(answers['MESTRE__SEGMENTO']).toBe('TECNOLOGIA_E_COMUNICACAO');
    expect(answers['MESTRE__STATUS_CONTRATO']).toBe('ATIVO');
    expect(answers['MESTRE__CLASSIFICACAO_A_D']).toBe('B');
    expect(warnings).toEqual([]);
  });

  it('aceita os rótulos do template novo direto', () => {
    const { answers } = translateMasterRow(
      {
        'Regime tributário': 'Lucro Real',
        'Perfil do Cliente': 'Empresa – PJ',
        'Faixa faturamento anual': 'R$ 1,2–4,8 mi',
      },
      CATALOG_FIELDS,
      origem,
    );
    expect(answers['MESTRE__REGIME_TRIBUTARIO']).toBe('LUCRO_REAL');
    expect(answers['MESTRE__PERFIL_DO_CLIENTE']).toBe('EMPRESA_PJ');
    expect(answers['MESTRE__FAIXA_FATURAMENTO_ANUAL']).toBe('R_1_2_4_8_MI');
  });

  it('faixa mensal ambígua não é adivinhada — avisa e deixa em branco', () => {
    const { answers, warnings } = translateMasterRow(
      { 'Faixa faturamento anual': 'Até R$ 100 mil/mês' },
      CATALOG_FIELDS,
      origem,
    );
    expect(answers['MESTRE__FAIXA_FATURAMENTO_ANUAL']).toBeUndefined();
    expect(warnings.join(' ')).toContain('atravessa mais de uma faixa anual');
  });

  it('CNPJ resolve o perfil quando a coluna não existe', () => {
    const { answers } = translateMasterRow({}, CATALOG_FIELDS, {
      ...origem,
      documento: '12345678000199',
    });
    expect(answers['MESTRE__PERFIL_DO_CLIENTE']).toBe('EMPRESA_PJ');
  });

  it('CPF não resolve o perfil sozinho e avisa', () => {
    const { answers, warnings } = translateMasterRow({}, CATALOG_FIELDS, {
      ...origem,
      documento: '12345678901',
    });
    expect(answers['MESTRE__PERFIL_DO_CLIENTE']).toBeUndefined();
    expect(warnings.join(' ')).toContain('Perfil do Cliente');
  });

  it('coluna ausente não gera aviso — só a presente com valor inválido', () => {
    const { warnings } = translateMasterRow({}, CATALOG_FIELDS, origem);
    // Sem documento e sem colunas, nada a traduzir e nada a reclamar.
    expect(warnings).toEqual([]);
  });
});

describe('bloco de frente', () => {
  it('converte a nota numérica do template antigo pela pontuação da opção', () => {
    // A escala antiga ia de 1 a 3: quanto maior, mais complexo. A conversão
    // segue a NOTA da opção no catálogo, não a posição dela na lista.
    const { answers, warnings } = translateFrontRow(
      { 'Nota Atendimento': 1, 'Nota Organização': 3 },
      CATALOG_FIELDS,
      'FISCAL',
      origem,
    );
    expect(answers['FISCAL__NOTA_ATENDIMENTO']).toBe('BAIXO');
    // Organização tem escala invertida: "Baixa" organização pontua 5, que é a
    // mais complexa. Nota 3 do template antigo é o cliente mais desorganizado.
    expect(answers['FISCAL__NOTA_ORGANIZACAO']).toBe('BAIXA');
    expect(warnings).toEqual([]);
  });

  it('não inverte a Organização, cuja escala é ao contrário das demais', () => {
    // Converter por posição faria a nota 1 (cliente organizado) virar
    // "Baixa" — o oposto do que a planilha diz. Numa importação isso
    // inverteria a Maturidade da Operação da carteira inteira.
    const { answers } = translateFrontRow(
      { 'Nota Organização': 1 },
      CATALOG_FIELDS,
      'FISCAL',
      origem,
    );
    expect(answers['FISCAL__NOTA_ORGANIZACAO']).toBe('ALTA');
  });

  it('aceita o rótulo da opção do template novo', () => {
    const { answers } = translateFrontRow(
      {
        'Forma recebimento documentos': 'Plataforma integrada',
        'Nota Volume': 'Alto',
      },
      CATALOG_FIELDS,
      'FISCAL',
      origem,
    );
    expect(answers['FISCAL__FORMA_RECEBIMENTO_DOCUMENTOS']).toBe(
      'PLATAFORMA_INTEGRADA',
    );
    expect(answers['FISCAL__NOTA_VOLUME']).toBe('ALTO');
  });

  it('valor fora das opções vira aviso, nunca resposta inventada', () => {
    const { answers, warnings } = translateFrontRow(
      { 'Forma recebimento documentos': 'Pombo-correio' },
      CATALOG_FIELDS,
      'FISCAL',
      origem,
    );
    expect(answers['FISCAL__FORMA_RECEBIMENTO_DOCUMENTOS']).toBeUndefined();
    expect(warnings.join(' ')).toContain('não corresponde a nenhuma opção');
  });

  it('nota fora de 1 a 3 avisa em vez de truncar', () => {
    const { answers, warnings } = translateFrontRow(
      { 'Nota Atendimento': 7 },
      CATALOG_FIELDS,
      'FISCAL',
      origem,
    );
    expect(answers['FISCAL__NOTA_ATENDIMENTO']).toBeUndefined();
    expect(warnings.join(' ')).toContain('não tem correspondência');
  });

  it('só traduz campos da frente pedida', () => {
    const { answers } = translateFrontRow(
      { 'Nota Rotatividade': 'Alta', 'Nota Atendimento': 'Alto' },
      CATALOG_FIELDS,
      'FISCAL',
      origem,
    );
    // Rotatividade só existe no Pessoal.
    expect(answers['PESSOAL__NOTA_ROTATIVIDADE']).toBeUndefined();
    expect(answers['FISCAL__NOTA_ATENDIMENTO']).toBe('ALTO');
  });

  it('quantidades do Pessoal entram como número', () => {
    const { answers } = translateFrontRow(
      { 'Qtd. Funcionários': '12', 'Qtd. Pró-labores': 2 },
      CATALOG_FIELDS,
      'PESSOAL',
      origem,
    );
    expect(answers['PESSOAL__QTD_FUNCIONARIOS']).toBe('12');
    expect(answers['PESSOAL__QTD_PRO_LABORES']).toBe('2');
  });

  it('célula vazia não vira resposta nem aviso', () => {
    const { answers, warnings } = translateFrontRow(
      { 'Nota Atendimento': '' },
      CATALOG_FIELDS,
      'FISCAL',
      origem,
    );
    expect(answers['FISCAL__NOTA_ATENDIMENTO']).toBeUndefined();
    expect(warnings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Colunas e valores reais do template MVP REV03 que circula no cliente
// (docs_cliente/02_Dicionario_e_Template_Unico_Carteira_MVP_REV03). Levantados
// da planilha em 11/09/2026 — estes testes garantem que uma importação real
// não cai em aviso por causa de rótulo ou grafia.
// ---------------------------------------------------------------------------
describe('template real do cliente (MVP REV03)', () => {
  it('traduz a linha de 01_Clientes como ela vem', () => {
    const { answers, warnings } = translateMasterRow(
      {
        'Tipo pessoa': 'PJ',
        'Status contrato': 'Ativo',
        'Faixa faturamento anual': 'R$ 1,2–4,8 mi',
        'Classificação A-D': 'A',
      },
      CATALOG_FIELDS,
      { origem: 'template real, linha 5' },
    );
    expect(answers['MESTRE__PERFIL_DO_CLIENTE']).toBe('EMPRESA_PJ');
    expect(answers['MESTRE__STATUS_CONTRATO']).toBe('ATIVO');
    expect(answers['MESTRE__FAIXA_FATURAMENTO_ANUAL']).toBe('R_1_2_4_8_MI');
    expect(answers['MESTRE__CLASSIFICACAO_A_D']).toBe('A');
    expect(warnings).toEqual([]);
  });

  it('traduz a linha de 02_Fiscal como ela vem, com notas de 1 a 3', () => {
    const { answers, warnings } = translateFrontRow(
      {
        'Forma recebimento documentos': 'Portal',
        'Nota Volume': '2',
        'Nota Atendimento': '3',
        'Nota Organização': '1',
      },
      CATALOG_FIELDS,
      'FISCAL',
      { origem: 'template real, linha 5' },
    );
    expect(answers['FISCAL__FORMA_RECEBIMENTO_DOCUMENTOS']).toBe('PORTAL');
    expect(answers['FISCAL__NOTA_VOLUME']).toBe('MEDIO');
    expect(answers['FISCAL__NOTA_ATENDIMENTO']).toBe('ALTO');
    // Organização tem escala invertida no template: "Alta" pontua 1.
    expect(answers['FISCAL__NOTA_ORGANIZACAO']).toBe('ALTA');
    expect(warnings).toEqual([]);
  });

  it('traduz as colunas de 04_Pessoal', () => {
    const { answers, warnings } = translateFrontRow(
      {
        'Qtd. Funcionários': 12,
        'Recebimento documentos': 'Portal',
        'Recebimento ponto': 'Planilha',
        'Envio documentos': 'E-mail',
        'Nota Rotatividade': '3',
      },
      CATALOG_FIELDS,
      'PESSOAL',
      { origem: 'template real, linha 5' },
    );
    expect(answers['PESSOAL__QTD_FUNCIONARIOS']).toBe('12');
    expect(answers['PESSOAL__RECEBIMENTO_DOCUMENTOS']).toBe('PORTAL');
    expect(answers['PESSOAL__RECEBIMENTO_PONTO']).toBe('PLANILHA');
    expect(answers['PESSOAL__ENVIO_DOCUMENTOS']).toBe('E_MAIL');
    expect(answers['PESSOAL__NOTA_ROTATIVIDADE']).toBe('ALTA');
    expect(warnings).toEqual([]);
  });
});
