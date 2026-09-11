import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientManager } from '../prisma/prisma-client-manager';
import { ComplexityFront } from '../client-catalog/client-catalog.types';
import {
  assessClient,
  assessFront,
  assessPortfolio,
  AggregateResult,
  FrontAssessmentResult,
} from './cc-co.rules';
import {
  buildFrontInput,
  isClientActive,
  resolveFront,
} from './cc-co.input';

// Orquestra o motor CC/CO: lê do banco, chama as funções puras, grava o
// resultado. Nenhuma regra de negócio mora aqui — o cálculo está em
// cc-co.rules.ts e a montagem da entrada em cc-co.input.ts.
//
// O motor antigo (ComplexityService, escala 1..3) continua existindo e
// servindo as telas atuais. Os dois convivem até a troca ser concluída.

// Mescla incremental das respostas: o formulário salva um passo por vez sem
// apagar o que já foi respondido nos outros. O retorno é tipado como
// Prisma.InputJsonValue porque o campo é Json e o cliente do Prisma não
// aceita Record<string, unknown> direto.
function mergeAnswers(
  current: unknown,
  incoming: Record<string, any>,
): Prisma.InputJsonValue {
  const base =
    current && typeof current === 'object' && !Array.isArray(current)
      ? (current as Record<string, any>)
      : {};
  return { ...base, ...incoming } as Prisma.InputJsonValue;
}

@Injectable()
export class CcCoService {
  constructor(private readonly prismaManager: PrismaClientManager) {}

  private getTenantPrisma(tenantId: string) {
    if (!tenantId)
      throw new NotFoundException('ID do escritório não informado.');
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  // Grava as respostas do catálogo e recalcula na sequência. As respostas do
  // bloco MESTRE vão no Client (valem para todas as frentes); as da frente vão
  // na classificação. O merge é incremental: o formulário pode salvar um passo
  // por vez sem apagar o que já foi respondido nos outros.
  async saveAnswers(
    tenantId: string,
    clientId: string,
    frontId: string,
    payload: {
      profileType?: string | null;
      masterAnswers?: Record<string, any>;
      frontAnswers?: Record<string, any>;
      // Responsáveis da frente. Ficam em coluna própria (operator1Id /
      // operator2Id), não em catalogAnswers, porque são relação com Employee
      // e o CCR por responsável depende de poder agrupar por esse id.
      primaryOwnerId?: string | null;
      secondaryOwnerId?: string | null;
    },
  ) {
    const prisma = this.getTenantPrisma(tenantId);

    if (payload.masterAnswers || payload.profileType !== undefined) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { catalogAnswers: true },
      });
      if (!client) throw new NotFoundException('Cliente não encontrado.');

      await prisma.client.update({
        where: { id: clientId },
        data: {
          ...(payload.profileType !== undefined
            ? { profileType: payload.profileType || null }
            : {}),
          ...(payload.masterAnswers
            ? {
                catalogAnswers: mergeAnswers(
                  client.catalogAnswers,
                  payload.masterAnswers,
                ),
              }
            : {}),
        },
      });
    }

    const mexeNaFrente =
      payload.frontAnswers ||
      payload.primaryOwnerId !== undefined ||
      payload.secondaryOwnerId !== undefined;

    if (mexeNaFrente) {
      const existing = await prisma.clientFrontClassification.findUnique({
        where: { clientId_frontId: { clientId, frontId } },
        select: { catalogAnswers: true },
      });
      if (!existing)
        throw new NotFoundException(
          'Cliente não está alocado nesta frente.',
        );

      await prisma.clientFrontClassification.update({
        where: { clientId_frontId: { clientId, frontId } },
        data: {
          ...(payload.frontAnswers
            ? {
                catalogAnswers: mergeAnswers(
                  existing.catalogAnswers,
                  payload.frontAnswers,
                ),
              }
            : {}),
          ...(payload.primaryOwnerId !== undefined
            ? { operator1Id: payload.primaryOwnerId || null }
            : {}),
          ...(payload.secondaryOwnerId !== undefined
            ? { operator2Id: payload.secondaryOwnerId || null }
            : {}),
        },
      });
    }

    return this.assessAndPersist(tenantId, clientId, frontId);
  }

  // Grava as respostas de VÁRIAS frentes de uma vez e recalcula todas.
  //
  // O cadastro enviava uma requisição por frente, e cada uma repetia as
  // respostas do bloco MESTRE — o mesmo cliente era atualizado três vezes com
  // o mesmo conteúdo. Somando as transações implícitas de cada update, um
  // cadastro de três frentes custava dezenas de idas ao banco, cada uma
  // atravessando de Ohio a São Paulo.
  //
  // Aqui o bloco geral é gravado uma vez só e as frentes vão numa transação.
  async saveClientAnswers(
    tenantId: string,
    clientId: string,
    payload: {
      profileType?: string | null;
      masterAnswers?: Record<string, any>;
      fronts: {
        frontId: string;
        frontAnswers?: Record<string, any>;
        primaryOwnerId?: string | null;
        secondaryOwnerId?: string | null;
      }[];
    },
  ) {
    const prisma = this.getTenantPrisma(tenantId);

    if (payload.masterAnswers || payload.profileType !== undefined) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { catalogAnswers: true },
      });
      if (!client) throw new NotFoundException('Cliente não encontrado.');

      await prisma.client.update({
        where: { id: clientId },
        data: {
          ...(payload.profileType !== undefined
            ? { profileType: payload.profileType || null }
            : {}),
          ...(payload.masterAnswers
            ? {
                catalogAnswers: mergeAnswers(
                  client.catalogAnswers,
                  payload.masterAnswers,
                ),
              }
            : {}),
        },
      });
    }

    const existentes = await prisma.clientFrontClassification.findMany({
      where: { clientId },
      select: { id: true, frontId: true, catalogAnswers: true },
    });
    const porFrente = new Map(existentes.map((c) => [c.frontId, c]));

    // Frente pedida sem classificação: cria antes de gravar, em vez de pular.
    // Pular calado era o defeito reportado em 10/09/2026 — o cadastro dizia
    // sucesso e duas das três frentes ficavam sem resposta nenhuma.
    const faltando = payload.fronts.filter((f) => !porFrente.has(f.frontId));
    for (const f of faltando) {
      const criada = await prisma.clientFrontClassification.create({
        data: { clientId, frontId: f.frontId, actsInFront: 'YES' },
        select: { id: true, frontId: true, catalogAnswers: true },
      });
      porFrente.set(criada.frontId, criada);
    }

    const escritas = [];
    for (const f of payload.fronts) {
      const atual = porFrente.get(f.frontId);
      if (!atual) continue;
      escritas.push(
        prisma.clientFrontClassification.update({
          where: { id: atual.id },
          data: {
            ...(f.frontAnswers
              ? {
                  catalogAnswers: mergeAnswers(
                    atual.catalogAnswers,
                    f.frontAnswers,
                  ),
                }
              : {}),
            ...(f.primaryOwnerId !== undefined
              ? { operator1Id: f.primaryOwnerId || null }
              : {}),
            ...(f.secondaryOwnerId !== undefined
              ? { operator2Id: f.secondaryOwnerId || null }
              : {}),
          },
        }),
      );
    }
    if (escritas.length > 0) await prisma.$transaction(escritas);

    return this.assessClientAllFronts(tenantId, clientId);
  }

  // Recalcula uma frente de um cliente e grava o resultado. É o único ponto
  // que escreve ccScore/coScore/ccClass/coClass/ccState/coState — nenhuma tela
  // pode digitar esses valores.
  async assessAndPersist(
    tenantId: string,
    clientId: string,
    frontId: string,
  ): Promise<FrontAssessmentResult | null> {
    const prisma = this.getTenantPrisma(tenantId);

    const classification = await prisma.clientFrontClassification.findUnique({
      where: { clientId_frontId: { clientId, frontId } },
      include: { client: true, front: true, hrInfo: true },
    });
    if (!classification)
      throw new NotFoundException('Cliente não está alocado nesta frente.');

    const front = resolveFront(classification.front?.name);
    // Frente com nome que não casa com nenhuma das três do motor: não dá para
    // calcular, e inventar um palpite seria pior. O registro fica sem índice
    // e o escritório precisa renomear ou mapear a frente.
    if (!front) return null;

    const result = assessFront(
      buildFrontInput(front, classification.client, classification),
    );

    await prisma.clientFrontClassification.update({
      where: { clientId_frontId: { clientId, frontId } },
      data: {
        ccScore: result.cc.value,
        coScore: result.co.value,
        ccClass: result.cc.class,
        coClass: result.co.class,
        ccState: result.cc.state,
        coState: result.co.state,
      },
    });

    return result;
  }

  // Avalia todas as frentes de um cliente SEM gravar. É o que a ficha do
  // cliente consome.
  //
  // Antes o GET chamava a versão que persiste, e abrir a ficha de um cliente
  // disparava um UPDATE por frente. Além de surpreendente — consultar não
  // deveria alterar —, cada update do Prisma abre transação implícita e custa
  // cerca de quatro idas ao banco. Medido em 10/09/2026: abrir a ficha de um
  // cliente com duas frentes fazia 15 consultas, das quais 12 eram das
  // escritas. Com o servidor em Ohio e o banco em São Paulo, isso é quase
  // dois segundos só de rede.
  //
  // Os índices seguem persistidos, mas no caminho de escrita: saveAnswers e
  // a edição do cliente recalculam e gravam. A leitura só lê.
  async readClientAssessment(tenantId: string, clientId: string) {
    const prisma = this.getTenantPrisma(tenantId);

    const classifications = await prisma.clientFrontClassification.findMany({
      where: { clientId },
      include: { client: true, front: true, hrInfo: true },
    });

    const fronts = this.evaluateAll(classifications);
    return { fronts, consolidated: assessClient(fronts) };
  }

  private evaluateAll(
    classifications: any[],
  ): (FrontAssessmentResult & { frontId: string; frontName: string })[] {
    const fronts: (FrontAssessmentResult & {
      frontId: string;
      frontName: string;
    })[] = [];
    for (const c of classifications) {
      const front = resolveFront(c.front?.name);
      if (!front) continue;
      fronts.push({
        ...assessFront(buildFrontInput(front, c.client, c)),
        frontId: c.frontId,
        frontName: c.front?.name ?? '',
      });
    }
    return fronts;
  }

  // Recalcula todas as frentes de um cliente E grava. Caminho de escrita:
  // chamado quando algo que alimenta o cálculo muda, não quando a tela abre.
  async assessClientAllFronts(tenantId: string, clientId: string) {
    const prisma = this.getTenantPrisma(tenantId);

    const classifications = await prisma.clientFrontClassification.findMany({
      where: { clientId },
      include: { client: true, front: true, hrInfo: true },
    });

    const fronts = this.evaluateAll(classifications);
    const porFrente = new Map(fronts.map((f) => [f.frontId, f]));

    // Uma transação só para todas as frentes, em vez de uma por update: são
    // três frentes no máximo, e cada update solto custaria a sua própria
    // transação implícita.
    const escritas = classifications
      .filter((c) => porFrente.has(c.frontId))
      .map((c) => {
        const r = porFrente.get(c.frontId) as FrontAssessmentResult;
        return prisma.clientFrontClassification.update({
          where: { id: c.id },
          data: {
            ccScore: r.cc.value,
            coScore: r.co.value,
            ccClass: r.cc.class,
            coClass: r.co.class,
            ccState: r.cc.state,
            coState: r.co.state,
          },
        });
      });
    if (escritas.length > 0) await prisma.$transaction(escritas);

    return { fronts, consolidated: assessClient(fronts) };
  }

  // Quanto do mapeamento do M0 já foi feito, e quanto falta.
  //
  // O índice só aparece quando a avaliação de uma frente fecha, então sem
  // esta contagem o escritório não tem como saber se está a 5 ou a 300
  // respostas do fim — vê só uma sequência de "não avaliado" e não sabe
  // dimensionar o esforço. É o indicador que diz se o M0 está entregue.
  //
  // Somente leitura: não persiste nada, para poder ser chamado a cada
  // abertura de tela sem efeito colateral.
  async getPortfolioCompleteness(tenantId: string, frontId?: string) {
    const prisma = this.getTenantPrisma(tenantId);

    const classifications = await prisma.clientFrontClassification.findMany({
      where: frontId ? { frontId } : {},
      include: { client: true, front: true, hrInfo: true },
    });

    interface Resumo {
      clientId: string;
      clientName: string;
      frentesAtivas: number;
      frentesFechadas: number;
      respostasFaltando: number;
    }

    const porCliente = new Map<string, Resumo>();
    const porFrente = new Map<
      string,
      { frontId: string; frontName: string; total: number; fechadas: number }
    >();
    let semMapeamentoDeFrente = 0;

    for (const c of classifications) {
      const front = resolveFront(c.front?.name);
      // Frente que não casa com nenhuma das três do motor não tem perguntas
      // definidas — contamos à parte em vez de somar como pendência.
      if (!front) {
        semMapeamentoDeFrente += 1;
        continue;
      }

      const input = buildFrontInput(front, c.client, c);
      const resultado = assessFront(input);

      const resumo = porCliente.get(c.clientId) ?? {
        clientId: c.clientId,
        clientName: c.client?.name ?? '',
        frentesAtivas: 0,
        frentesFechadas: 0,
        respostasFaltando: 0,
      };

      if (input.active) {
        resumo.frentesAtivas += 1;

        const fechada =
          resultado.cc.state === 'ASSESSED' && resultado.co.state === 'ASSESSED';
        if (fechada) resumo.frentesFechadas += 1;

        // Atendimento pontua nos dois índices, então aparece nas duas listas
        // de pendências. Contar por chave única evita inflar o número.
        const faltando = new Set([
          ...resultado.cc.missing,
          ...resultado.co.missing,
        ]);
        resumo.respostasFaltando += faltando.size;

        const agregadoFrente = porFrente.get(c.frontId) ?? {
          frontId: c.frontId,
          frontName: c.front?.name ?? '',
          total: 0,
          fechadas: 0,
        };
        agregadoFrente.total += 1;
        if (fechada) agregadoFrente.fechadas += 1;
        porFrente.set(c.frontId, agregadoFrente);
      }

      porCliente.set(c.clientId, resumo);
    }

    const clientes = [...porCliente.values()];
    const comFrenteAtiva = clientes.filter((r) => r.frentesAtivas > 0);

    const completos = comFrenteAtiva.filter(
      (r) => r.frentesFechadas === r.frentesAtivas,
    );
    const naoIniciados = comFrenteAtiva.filter((r) => r.frentesFechadas === 0);

    return {
      totalClients: clientes.length,
      // Cliente sem nenhuma frente ativa está fora da operação: não conta como
      // pendência de mapeamento, senão o indicador nunca fecharia.
      activeClients: comFrenteAtiva.length,
      inactiveClients: clientes.length - comFrenteAtiva.length,
      complete: completos.length,
      partial: comFrenteAtiva.length - completos.length - naoIniciados.length,
      notStarted: naoIniciados.length,
      completePercent:
        comFrenteAtiva.length > 0
          ? Math.round((completos.length / comFrenteAtiva.length) * 100)
          : null,
      // O tamanho real do trabalho que falta, em respostas.
      missingAnswers: comFrenteAtiva.reduce(
        (soma, r) => soma + r.respostasFaltando,
        0,
      ),
      unmappedFronts: semMapeamentoDeFrente,
      byFront: [...porFrente.values()],
      // Quem está mais longe de fechar vem primeiro: é por onde começar.
      pending: comFrenteAtiva
        .filter((r) => r.frentesFechadas < r.frentesAtivas)
        .sort((a, b) => b.respostasFaltando - a.respostasFaltando)
        .slice(0, 20)
        .map((r) => ({
          clientId: r.clientId,
          clientName: r.clientName,
          missingAnswers: r.respostasFaltando,
          frontsDone: r.frentesFechadas,
          frontsTotal: r.frentesAtivas,
        })),
    };
  }

  // Índices da carteira. Sem frontId, consolida o escritório inteiro pelo
  // pool de observações cliente-frente — mesma base da aba de lógica do
  // template, e não a média das médias de cada área.
  async getPortfolioAssessment(
    tenantId: string,
    frontId?: string,
  ): Promise<
    AggregateResult & { front: ComplexityFront | null; byFront?: any[] }
  > {
    const prisma = this.getTenantPrisma(tenantId);

    const classifications = await prisma.clientFrontClassification.findMany({
      where: frontId ? { frontId } : {},
      include: { client: true, front: true },
    });

    // Mesma regra de "ativo" usada em buildFrontInput. Duplicar a checagem
    // aqui faria "Sem Movimento" contar na carteira e não contar no cálculo
    // da frente — o índice do escritório deixaria de bater com a soma das
    // partes.
    const records = classifications.map((c) => ({
      active: c.actsInFront === 'YES' && isClientActive(c.client?.status),
      cc: c.ccScore,
      co: c.coScore,
    }));

    const resolved = frontId
      ? resolveFront(classifications[0]?.front?.name)
      : null;

    // Sem frontId, devolve também a quebra por frente. São os quatro recortes
    // da aba "Lógica da Complexidade" do template: o consolidado do escritório
    // mais uma linha por área. Numa chamada só, porque a tela mostra os dois
    // juntos e pedir quatro vezes multiplicaria a travessia até o banco.
    //
    // O geral é o pool de TODAS as observações cliente-frente, não a média das
    // médias das áreas: com carteiras de tamanhos diferentes por frente os
    // dois resultados divergem, e o pool é o que a planilha calcula.
    const byFront = frontId
      ? undefined
      : Object.values(
          classifications.reduce(
            (acc: Record<string, any>, c: any, i: number) => {
              const chave = c.frontId;
              acc[chave] = acc[chave] ?? {
                frontId: c.frontId,
                frontName: c.front?.name ?? '',
                front: resolveFront(c.front?.name),
                registros: [],
              };
              acc[chave].registros.push(records[i]);
              return acc;
            },
            {},
          ),
        ).map((g: any) => ({
          frontId: g.frontId,
          frontName: g.frontName,
          front: g.front,
          ...assessPortfolio(g.registros),
        }));

    return { ...assessPortfolio(records), front: resolved, byFront };
  }
}
