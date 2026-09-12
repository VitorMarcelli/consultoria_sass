import { translateFrontRow, translateMasterRow } from './catalog-import';
import { CATALOG_FIELDS } from '../client-catalog/client-catalog.data';
import {
  CatalogField,
  COMPLEXITY_FRONTS,
} from '../client-catalog/client-catalog.types';

// ---------------------------------------------------------------------------
// Garantia exaustiva: toda opção de toda lista do catálogo, escrita na planilha
// exatamente como o template a oferece, tem de voltar como aquela opção.
//
// Este teste existe por causa de um caso real de 11/09/2026. A coluna "Faixa
// faturamento anual" vinha preenchida no template e chegava vazia no sistema:
// a Complexidade do Cliente ficava incompleta e o cliente não classificava.
// Ninguém tinha errado o preenchimento — a tradução é que não reconhecia o
// rótulo da própria lista que o template oferece.
//
// Um teste por campo não teria pego isso: o defeito estava em quatro campos e
// só em algumas das suas opções. Por isso aqui se varre o catálogo inteiro, e
// qualquer opção nova que o cliente acrescente à planilha entra na varredura
// sozinha.
// ---------------------------------------------------------------------------

const listasComOpcoes = (fields: CatalogField[]) =>
  fields.filter((f) => f.type === 'LISTA' && (f.options ?? []).length > 0);

describe('toda opção do catálogo volta como ela mesma', () => {
  const mestre = listasComOpcoes(
    CATALOG_FIELDS.filter((f) => f.block === 'MESTRE'),
  );

  it('o catálogo tem listas para varrer nos quatro blocos', () => {
    // Se o catálogo for regenerado vazio ou com outro formato, os testes abaixo
    // passariam sem testar nada.
    expect(mestre.length).toBeGreaterThan(3);
    for (const front of COMPLEXITY_FRONTS) {
      expect(
        listasComOpcoes(CATALOG_FIELDS.filter((f) => f.block === front)).length,
      ).toBeGreaterThan(3);
    }
  });

  it('bloco do cliente (MESTRE)', () => {
    const falhas: string[] = [];
    for (const field of mestre) {
      for (const opcao of field.options ?? []) {
        const { answers, warnings } = translateMasterRow(
          { [field.label]: opcao.label },
          CATALOG_FIELDS,
          { origem: 'varredura', documento: '12345678000199' },
        );
        if (answers[field.key] !== opcao.value) {
          falhas.push(
            `${field.label} = "${opcao.label}" devolveu ${answers[field.key] ?? 'nada'}, esperado ${opcao.value}${warnings.length ? ` (${warnings[0]})` : ''}`,
          );
        }
      }
    }
    expect(falhas).toEqual([]);
  });

  it.each(COMPLEXITY_FRONTS)('bloco %s', (front) => {
    const falhas: string[] = [];
    for (const field of listasComOpcoes(
      CATALOG_FIELDS.filter((f) => f.block === front),
    )) {
      for (const opcao of field.options ?? []) {
        const { answers, warnings } = translateFrontRow(
          { [field.label]: opcao.label },
          CATALOG_FIELDS,
          front,
          { origem: 'varredura' },
        );
        if (answers[field.key] !== opcao.value) {
          falhas.push(
            `${field.label} = "${opcao.label}" devolveu ${answers[field.key] ?? 'nada'}, esperado ${opcao.value}${warnings.length ? ` (${warnings[0]})` : ''}`,
          );
        }
      }
    }
    expect(falhas).toEqual([]);
  });
});
