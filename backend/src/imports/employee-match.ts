// Resolve o nome de um responsável escrito na planilha para um colaborador.
//
// É a única coluna do template que aponta para outro cadastro, e por isso a
// única que não tem lista de opções: quem preenche digita o nome à mão. Duas
// coisas podem dar errado, e as duas davam errado em silêncio.
//
// A primeira é o nome não existir — alguém escreve "João" e o cadastro tem
// "João Pedro Alves", ou a pessoa nem foi cadastrada ainda. O importador
// gravava null e seguia; o escritório terminava a importação achando que a
// carteira estava distribuída, e a frente ficava sem dono. Era exatamente o
// caso relatado em 11/09/2026.
//
// A segunda é pior. A busca antiga era por trecho contido:
//
//     emp.name.toLowerCase().includes(nomeDigitado)
//
// "Ana" está contido em "Mariana Costa". Quem digitasse o primeiro nome podia
// receber uma pessoa diferente — e o responsável é o que alimenta o
// coeficiente por responsável no Diagnóstico e o planejamento de capacidade.
// Atribuir a pessoa errada é pior que não atribuir ninguém, porque parece
// certo. É a mesma armadilha que já tinha aparecido no casamento de nome de
// frente, onde "logística" casava com "TI".
//
// Aqui a comparação é por palavra inteira, e ambiguidade nunca é resolvida no
// chute: vira aviso e o campo fica vazio, para a pessoa decidir.

export interface EmployeeLike {
  id: string;
  name: string;
}

export type EmployeeMatch =
  | { status: 'VAZIO' }
  | { status: 'ENCONTRADO'; id: string; name: string }
  | { status: 'AMBIGUO'; candidates: string[] }
  | { status: 'NAO_ENCONTRADO' };

function norm(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function palavras(value: string): string[] {
  return norm(value).split(' ').filter(Boolean);
}

export function matchEmployee(
  raw: unknown,
  employees: EmployeeLike[],
): EmployeeMatch {
  const alvo = norm(raw);
  if (!alvo) return { status: 'VAZIO' };

  // Nome completo igual: caso normal, resolve sem ambiguidade.
  const exatos = employees.filter((e) => norm(e.name) === alvo);
  if (exatos.length === 1)
    return { status: 'ENCONTRADO', id: exatos[0].id, name: exatos[0].name };
  if (exatos.length > 1)
    return { status: 'AMBIGUO', candidates: exatos.map((e) => e.name) };

  // Nome parcial: todas as palavras digitadas têm de aparecer como palavra
  // inteira no nome cadastrado. "Ana Paula" encontra "Ana Paula Souza";
  // "Ana" não encontra "Mariana".
  const digitadas = palavras(alvo);
  const parciais = employees.filter((e) => {
    const doCadastro = new Set(palavras(e.name));
    return digitadas.every((p) => doCadastro.has(p));
  });

  if (parciais.length === 1)
    return { status: 'ENCONTRADO', id: parciais[0].id, name: parciais[0].name };
  if (parciais.length > 1)
    return { status: 'AMBIGUO', candidates: parciais.map((e) => e.name) };

  return { status: 'NAO_ENCONTRADO' };
}
