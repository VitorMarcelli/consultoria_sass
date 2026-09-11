import { matchEmployee } from './employee-match';

const equipe = [
  { id: '1', name: 'Mariana Costa' },
  { id: '2', name: 'Ana Paula Souza' },
  { id: '3', name: 'João Pedro Alves' },
  { id: '4', name: 'Carlos Eduardo' },
];

describe('responsável escrito na planilha', () => {
  it('encontra pelo nome completo, ignorando acento e caixa', () => {
    expect(matchEmployee('JOAO PEDRO ALVES', equipe)).toEqual({
      status: 'ENCONTRADO',
      id: '3',
      name: 'João Pedro Alves',
    });
    expect(matchEmployee('  Ana Paula Souza ', equipe)).toMatchObject({
      status: 'ENCONTRADO',
      id: '2',
    });
  });

  it('não casa "Ana" com "Mariana"', () => {
    // A busca antiga era por trecho contido, e "ana" está dentro de "mariana".
    // Quem digitasse o primeiro nome podia levar outra pessoa — e o
    // responsável alimenta o coeficiente por responsável e o planejamento de
    // capacidade. Atribuir a pessoa errada é pior que não atribuir ninguém,
    // porque parece certo.
    // "Ana" é palavra inteira só em "Ana Paula Souza", então identifica ela —
    // e em "Mariana" não é palavra nenhuma, é pedaço.
    expect(matchEmployee('Ana', equipe)).toMatchObject({
      status: 'ENCONTRADO',
      id: '2',
    });
    // E o caso puro: um nome que só existe como pedaço não encontra ninguém.
    expect(matchEmployee('Ari', equipe)).toEqual({ status: 'NAO_ENCONTRADO' });
  });

  it('aceita nome parcial quando ele identifica uma pessoa só', () => {
    expect(matchEmployee('Ana Paula', equipe)).toMatchObject({
      status: 'ENCONTRADO',
      id: '2',
    });
    expect(matchEmployee('Mariana', equipe)).toMatchObject({
      status: 'ENCONTRADO',
      id: '1',
    });
  });

  it('nome parcial que serve a mais de uma pessoa vira ambiguidade, não chute', () => {
    const comDoisPedros = [...equipe, { id: '5', name: 'Pedro Henrique' }];
    const r = matchEmployee('Pedro', comDoisPedros);
    expect(r.status).toBe('AMBIGUO');
    if (r.status === 'AMBIGUO') {
      expect(r.candidates.sort()).toEqual(['João Pedro Alves', 'Pedro Henrique']);
    }
  });

  it('homônimos exatos também param em ambiguidade', () => {
    const r = matchEmployee('Carlos Eduardo', [
      ...equipe,
      { id: '6', name: 'Carlos Eduardo' },
    ]);
    expect(r.status).toBe('AMBIGUO');
  });

  it('nome que não existe é reportado, não silenciado', () => {
    expect(matchEmployee('Fulano de Tal', equipe)).toEqual({
      status: 'NAO_ENCONTRADO',
    });
  });

  it('célula vazia não é erro', () => {
    expect(matchEmployee('', equipe)).toEqual({ status: 'VAZIO' });
    expect(matchEmployee(null, equipe)).toEqual({ status: 'VAZIO' });
    expect(matchEmployee('   ', equipe)).toEqual({ status: 'VAZIO' });
  });
});
