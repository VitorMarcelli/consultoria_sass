/**
 * Backfill das respostas do catálogo a partir dos dados legados.
 *
 * Por padrão RODA EM SECO: só relata o que faria. Grava apenas com --apply.
 *
 *   npx ts-node scripts/backfill-catalogo.ts              (relatório)
 *   npx ts-node scripts/backfill-catalogo.ts --apply      (grava)
 *   npx ts-node scripts/backfill-catalogo.ts --tenant=<id>
 *
 * O que ele faz: traduz o texto livre já gravado (regime, segmento, faixa de
 * faturamento, status, perfil e os campos operacionais das frentes) para os
 * códigos do catálogo, e grava em Client.catalogAnswers e
 * ClientFrontClassification.catalogAnswers.
 *
 * O que ele NÃO faz: inventar nota. As notas de Volume, Atendimento,
 * Organização e Rotatividade são julgamento do consultor e nunca existiram no
 * banco — nenhum backfill pode preenchê-las. O objetivo aqui é tirar a
 * carteira do zero e deixar visível exatamente o que falta responder.
 *
 * Quando um valor legado não determina o código com segurança, ele é
 * reportado como AMBÍGUO e não é gravado. Ver legacy-mapping.ts.
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { CATALOG_FIELDS } from '../src/client-catalog/client-catalog.data';
import {
  mapByLabel,
  mapProfileType,
  mapRevenueBracket,
  mapSegment,
  mapStatus,
  mapTaxRegime,
  MappingOutcome,
} from '../src/client-catalog/legacy-mapping';

dotenv.config();

const APPLY = process.argv.includes('--apply');
const TENANT_ARG = process.argv
  .find((a) => a.startsWith('--tenant='))
  ?.split('=')[1];

const globalPrisma = new PrismaClient();

function clientFor(schemaName: string): PrismaClient {
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.set('schema', schemaName);
  return new PrismaClient({ datasources: { db: { url: url.toString() } } });
}

const optionsOf = (key: string) =>
  (CATALOG_FIELDS.find((f) => f.key === key)?.options ?? []).map((o) => ({
    value: o.value,
    label: o.label,
  }));

// Campos operacionais das frentes que já foram gravados com os rótulos do
// template, e portanto casam direto pelo rótulo.
const FRONT_MAPPINGS: {
  front: 'FISCAL' | 'CONTABIL' | 'PESSOAL';
  relation: 'taxInfo' | 'accountingInfo' | 'hrInfo';
  column: string;
  key: string;
}[] = [
  { front: 'FISCAL', relation: 'taxInfo', column: 'documentReceiptMethod', key: 'FISCAL__FORMA_RECEBIMENTO_DOCUMENTOS' },
  { front: 'FISCAL', relation: 'taxInfo', column: 'documentSendMethod', key: 'FISCAL__FORMA_ENVIO_DOCUMENTOS' },
  { front: 'FISCAL', relation: 'taxInfo', column: 'integrationMethod', key: 'FISCAL__FORMA_INTEGRACAO' },
  { front: 'CONTABIL', relation: 'accountingInfo', column: 'documentReceiptMethod', key: 'CONTABIL__FORMA_RECEBIMENTO_DOCUMENTOS' },
  { front: 'CONTABIL', relation: 'accountingInfo', column: 'documentSendMethod', key: 'CONTABIL__FORMA_ENVIO_DOCUMENTOS' },
  { front: 'CONTABIL', relation: 'accountingInfo', column: 'integrationMethod', key: 'CONTABIL__FORMA_INTEGRACAO' },
  { front: 'CONTABIL', relation: 'accountingInfo', column: 'launchMethod', key: 'CONTABIL__FORMA_DE_LANCAMENTO' },
  { front: 'CONTABIL', relation: 'accountingInfo', column: 'closingPeriod', key: 'CONTABIL__PERIODICIDADE_DE_FECHAMENTO' },
  { front: 'PESSOAL', relation: 'hrInfo', column: 'documentReceiptMethod', key: 'PESSOAL__RECEBIMENTO_DOCUMENTOS' },
  { front: 'PESSOAL', relation: 'hrInfo', column: 'pointReceiptMethod', key: 'PESSOAL__RECEBIMENTO_PONTO' },
];

function matchFront(name: string): 'FISCAL' | 'CONTABIL' | 'PESSOAL' | null {
  const n = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (/fiscal|tributar|impost/.test(n)) return 'FISCAL';
  if (/contab|escritur|societ/.test(n)) return 'CONTABIL';
  if (/pessoal|folha|trabalhista|rh/.test(n) || /\bdp\b/.test(n))
    return 'PESSOAL';
  return null;
}

interface Contagem {
  mapeado: number;
  ambiguo: number;
  desconhecido: number;
  vazio: number;
}

const zerado = (): Contagem => ({
  mapeado: 0,
  ambiguo: 0,
  desconhecido: 0,
  vazio: 0,
});

function registra(
  acc: Record<string, Contagem>,
  campo: string,
  r: MappingOutcome,
  problemas: string[],
  quem: string,
) {
  acc[campo] = acc[campo] ?? zerado();
  if (r.status === 'MAPEADO') acc[campo].mapeado++;
  else if (r.status === 'VAZIO') acc[campo].vazio++;
  else if (r.status === 'AMBIGUO') {
    acc[campo].ambiguo++;
    problemas.push(`  AMBÍGUO  ${quem} · ${campo}: ${r.reason}`);
  } else {
    acc[campo].desconhecido++;
    problemas.push(`  ?        ${quem} · ${campo}: ${r.reason}`);
  }
}

async function processaTenant(tenantId: string, nome: string) {
  const schema = `tenant_${tenantId.replace(/-/g, '_')}`;
  const prisma = clientFor(schema);

  try {
    const clients = await prisma.client.findMany({
      include: {
        frontClassifications: {
          include: { front: true, taxInfo: true, accountingInfo: true, hrInfo: true },
        },
      },
    });
    if (clients.length === 0) return null;

    const acc: Record<string, Contagem> = {};
    const problemas: string[] = [];
    let clientesTocados = 0;
    let frentesTocadas = 0;

    for (const c of clients) {
      const quem = c.name?.slice(0, 34) ?? c.id;
      const master: Record<string, string> = {};
      let profileType: string | null = null;

      const pares: [string, string, MappingOutcome][] = [
        ['MESTRE__REGIME_TRIBUTARIO', 'regime', mapTaxRegime(c.taxRegime)],
        ['MESTRE__SEGMENTO', 'segmento', mapSegment(c.segment)],
        ['MESTRE__FAIXA_FATURAMENTO_ANUAL', 'faturamento', mapRevenueBracket(c.revenueBracket)],
        ['MESTRE__STATUS_CONTRATO', 'status', mapStatus(c.status)],
      ];
      for (const [key, rotulo, r] of pares) {
        registra(acc, rotulo, r, problemas, quem);
        if (r.status === 'MAPEADO') master[key] = r.code;
      }

      const perfil = mapProfileType((c as any).personType, c.cnpj);
      registra(acc, 'perfil', perfil, problemas, quem);
      if (perfil.status === 'MAPEADO') {
        profileType = perfil.code;
        master['MESTRE__PERFIL_DO_CLIENTE'] = perfil.code;
      }

      if (c.classification) {
        master['MESTRE__CLASSIFICACAO_A_D'] = c.classification.toUpperCase();
        acc['classificação'] = acc['classificação'] ?? zerado();
        acc['classificação'].mapeado++;
      }

      if (Object.keys(master).length > 0) {
        clientesTocados++;
        if (APPLY) {
          await prisma.client.update({
            where: { id: c.id },
            data: {
              profileType: profileType ?? undefined,
              catalogAnswers: {
                ...(((c as any).catalogAnswers as object) ?? {}),
                ...master,
              },
            } as any,
          });
        }
      }

      for (const fc of c.frontClassifications) {
        const front = matchFront(fc.front?.name ?? '');
        if (!front) continue;
        const answers: Record<string, string> = {};
        for (const m of FRONT_MAPPINGS.filter((x) => x.front === front)) {
          const source = (fc as any)[m.relation];
          if (!source) continue;
          const r = mapByLabel(source[m.column], optionsOf(m.key));
          registra(acc, `${front.toLowerCase()}·${m.column}`, r, problemas, quem);
          if (r.status === 'MAPEADO') answers[m.key] = r.code;
        }
        if (Object.keys(answers).length > 0) {
          frentesTocadas++;
          if (APPLY) {
            await prisma.clientFrontClassification.update({
              where: { id: fc.id },
              data: {
                catalogAnswers: {
                  ...(((fc as any).catalogAnswers as object) ?? {}),
                  ...answers,
                },
              } as any,
            });
          }
        }
      }
    }

    console.log(`\n${'='.repeat(72)}`);
    console.log(`${nome}  —  ${clients.length} clientes`);
    console.log('='.repeat(72));
    console.log(
      '  campo'.padEnd(42) + 'mapeado  ambíguo  descon.  vazio',
    );
    for (const [campo, n] of Object.entries(acc).sort()) {
      console.log(
        `  ${campo}`.padEnd(42) +
          String(n.mapeado).padStart(7) +
          String(n.ambiguo).padStart(9) +
          String(n.desconhecido).padStart(9) +
          String(n.vazio).padStart(7),
      );
    }
    console.log(
      `\n  ${clientesTocados} clientes e ${frentesTocadas} frentes receberiam resposta.`,
    );
    if (problemas.length) {
      console.log(`\n  Precisam de decisão humana (${problemas.length}):`);
      for (const p of problemas.slice(0, 12)) console.log(p);
      if (problemas.length > 12)
        console.log(`  ... e mais ${problemas.length - 12}`);
    }

    return { clientesTocados, frentesTocadas, problemas: problemas.length };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log(
    APPLY
      ? '>>> MODO GRAVAÇÃO: as respostas serão persistidas.\n'
      : '>>> Modo relatório (nada é gravado). Use --apply para gravar.\n',
  );

  const tenants = await globalPrisma.tenant.findMany();
  const alvo = TENANT_ARG
    ? tenants.filter((t) => t.id === TENANT_ARG)
    : tenants;

  let clientes = 0;
  let frentes = 0;
  let problemas = 0;
  for (const t of alvo) {
    try {
      const r = await processaTenant(t.id, t.name);
      if (r) {
        clientes += r.clientesTocados;
        frentes += r.frentesTocadas;
        problemas += r.problemas;
      }
    } catch (e: any) {
      console.log(`\n[ERRO] ${t.name}: ${e.message}`);
    }
  }

  console.log(`\n${'='.repeat(72)}`);
  console.log(
    `TOTAL: ${clientes} clientes, ${frentes} frentes, ${problemas} pendências humanas.`,
  );
  if (!APPLY) console.log('Nada foi gravado. Rode com --apply para persistir.');
}

main()
  .catch(console.error)
  .finally(() => globalPrisma.$disconnect());
