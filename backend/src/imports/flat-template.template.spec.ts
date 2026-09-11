import { splitFlatRow } from './flat-template';
import { translateFrontRow, translateMasterRow } from './catalog-import';
import { CATALOG_FIELDS } from '../client-catalog/client-catalog.data';
import { COMPLEXITY_FRONTS } from '../client-catalog/client-catalog.types';
import { buildFrontInput } from '../complexity/cc-co.input';
import { assessFront } from '../complexity/cc-co.rules';

// Colunas e valores copiados do template gerado por
// docs/tools/gerar-template-carteira.py — frontend/public/Template_Carteira_
// Sevilha.xlsx. Uma linha preenchida como o escritório preencheria.
//
// Este é o teste que fecha o circuito: se o gerador mudar um rótulo, um
// prefixo ou uma opção de lista, a importação passaria a deixar respostas em
// branco sem reclamar — o cliente entraria na carteira sem complexidade e o
// erro só apareceria semanas depois, no planejamento. Aqui ele aparece agora.
const LINHA_DO_TEMPLATE: Record<string, any> = {
    'Data de Início (Operação)': '2026-09',
    'Ciclo (AAAA-MM)': '2026-09',
    'CNPJ/CPF': '12.345.678/0001-99',
    'Perfil do Cliente': 'Produtor Rural – PF',
    'Razão social/Nome': 'ACME Indústria Ltda',
    'Nome fantasia': 'ACME',
    'Status contrato': 'Ativo',
    'Segmento': 'Alimentação, Hotelaria e Turismo',
    'Regime tributário': 'Lucro Presumido',
    'Honorário faturado': 2500,
    'Faixa faturamento anual': 'R$ 360 mil–1,2 mi',
    'Classificação A-D': 'B',
    'Fiscal?': 'Sim',
    'Contábil?': 'Sim',
    'Pessoal?': 'Sim',
    'Observações - Gerais': '',
    'Fiscal | Status da frente': 'Ativo',
    'Fiscal | Responsável principal': '',
    'Fiscal | Responsável secundário': '',
    'Fiscal | Forma recebimento documentos': 'Portal',
    'Fiscal | Forma envio documentos': 'Portal',
    'Fiscal | Forma integração': 'Importação de arquivo',
    'Fiscal | Nota Volume': 'Médio',
    'Fiscal | Nota Atendimento': 'Médio',
    'Fiscal | Nota Organização': 'Média',
    'Fiscal | Observações': '',
    'Contábil | Status da frente': 'Ativo',
    'Contábil | Responsável principal': '',
    'Contábil | Responsável secundário': '',
    'Contábil | Forma recebimento documentos': 'Portal',
    'Contábil | Forma envio documentos': 'Portal',
    'Contábil | Forma integração': 'Importação de arquivo',
    'Contábil | Forma de lançamento': 'Importação de arquivo',
    'Contábil | Periodicidade de Fechamento': 'Bimestral',
    'Contábil | Último Mês de Conciliação': '2026-09',
    'Contábil | Nota Volume': 'Médio',
    'Contábil | Nota Atendimento': 'Médio',
    'Contábil | Nota Organização': 'Média',
    'Contábil | Observações': '',
    'Pessoal | Status da frente': 'Ativo',
    'Pessoal | Responsável principal': '',
    'Pessoal | Responsável secundário': '',
    'Pessoal | Qtd. Funcionários': 30,
    'Pessoal | Qtd. Pró-labores': 2,
    'Pessoal | Qtd. Domésticas': 0,
    'Pessoal | Recebimento documentos': 'Portal',
    'Pessoal | Recebimento ponto': 'Arquivo/Exportação',
    'Pessoal | Envio documentos': 'Portal',
    'Pessoal | Nota Atendimento': 'Médio',
    'Pessoal | Nota Organização': 'Média',
    'Pessoal | Nota Rotatividade': 'Média',
    'Pessoal | Observações': '',
};

describe('template de coluna única, ponta a ponta', () => {
  const { master, fronts, flat } = splitFlatRow(
    LINHA_DO_TEMPLATE,
    CATALOG_FIELDS,
  );

  it('é reconhecido como coluna única e abre as três frentes', () => {
    expect(flat).toBe(true);
    expect(Object.keys(fronts).sort()).toEqual([
      'CONTABIL',
      'FISCAL',
      'PESSOAL',
    ]);
  });

  it('traduz o bloco do cliente sem nenhum aviso', () => {
    const { answers, warnings } = translateMasterRow(master, CATALOG_FIELDS, {
      origem: 'template, linha 2',
      documento: '12345678000199',
    });
    expect(warnings).toEqual([]);
    expect(answers['MESTRE__PERFIL_DO_CLIENTE']).toBe('PRODUTOR_RURAL_PF');
    expect(answers['MESTRE__STATUS_CONTRATO']).toBe('ATIVO');
    expect(answers['MESTRE__REGIME_TRIBUTARIO']).toBe('LUCRO_PRESUMIDO');
    expect(answers['MESTRE__SEGMENTO']).toBe('ALIMENTACAO_HOTELARIA_E_TURISMO');
    expect(answers['MESTRE__FAIXA_FATURAMENTO_ANUAL']).toBeDefined();
  });

  it.each(COMPLEXITY_FRONTS)(
    'traduz a frente %s sem aviso e responde todos os campos que pontuam',
    (front) => {
      const linha = fronts[front];
      expect(linha).toBeDefined();
      const { answers, warnings } = translateFrontRow(
        linha!,
        CATALOG_FIELDS,
        front,
        { origem: `template, linha 2, ${front}` },
      );
      expect(warnings).toEqual([]);

      // Campo que pontua e ficou sem resposta é furo de template: a média sai
      // parcial e a frente nem chega a ser classificada.
      const pontuam = CATALOG_FIELDS.filter(
        (f) =>
          f.block === front &&
          f.type === 'LISTA' &&
          ['CC', 'CO', 'AMBOS'].includes(f.role),
      );
      const semResposta = pontuam
        .filter((f) => !answers[f.key])
        .map((f) => f.label);
      expect(semResposta).toEqual([]);
    },
  );

  it('sai com os dois índices calculados, em uma casa decimal', () => {
    const mestre = translateMasterRow(master, CATALOG_FIELDS, {
      origem: 'template, linha 2',
      documento: '12345678000199',
    }).answers;

    for (const front of COMPLEXITY_FRONTS) {
      const respostas = translateFrontRow(
        fronts[front]!,
        CATALOG_FIELDS,
        front,
        { origem: `template, linha 2, ${front}` },
      ).answers;

      const avaliacao = assessFront(
        buildFrontInput(
          front,
          { status: 'ACTIVE', catalogAnswers: mestre },
          {
            actsInFront: 'YES',
            catalogAnswers: respostas,
            hrInfo:
              front === 'PESSOAL'
                ? { employeesCount: 30, prolaboreCount: 2, domesticsCount: 0 }
                : null,
          },
        ),
      );

      expect(avaliacao.cc.state).toBe('ASSESSED');
      expect(avaliacao.co.state).toBe('ASSESSED');
      for (const valor of [avaliacao.cc.value, avaliacao.co.value]) {
        expect(valor).not.toBeNull();
        expect(valor).toBeGreaterThan(0);
        expect(valor).toBeLessThanOrEqual(5);
        // Uma casa decimal, como a régua de classes decidida em 09/09/2026.
        expect(Number((valor as number).toFixed(1))).toBe(valor);
      }
    }
  });
});
