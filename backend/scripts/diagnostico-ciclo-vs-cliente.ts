/**
 * Diagnóstico SOMENTE-LEITURA para decidir a questão nº 7 da ORDEM-02:
 * o cadastro do cliente é editado no `Client` (vivo) ou no
 * `ClientCycleSnapshot` (congelado por ciclo)?
 *
 * Em vez de decidir por opinião, este script mede o que já está acontecendo
 * nos dados reais de cada escritório:
 *
 *  1. Quantos ciclos existem — se só há um, ninguém ainda viveu a virada de
 *     ciclo e a pergunta é teórica;
 *  2. Quanto o congelado JÁ DIVERGE do vivo — se diverge, o snapshot está de
 *     fato funcionando como histórico e apagá-lo destruiria informação;
 *  3. Se um mesmo cliente muda de valor ENTRE ciclos — é a evidência direta
 *     de que o dado é por competência e não um atributo fixo do cliente;
 *  4. Quantos snapshots estão sem avaliação congelada — dívida do período
 *     anterior ao Bloco B.
 *
 * NÃO ESCREVE NADA. Pode rodar em produção com segurança.
 *
 * Uso, a partir de backend/:
 *   npx ts-node scripts/diagnostico-ciclo-vs-cliente.ts
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const globalPrisma = new PrismaClient();

// Campos que existem nos dois lados (Client e ClientCycleSnapshot) e que,
// portanto, podem divergir. São exatamente os que o template MVP marca como
// "do ciclo de referência".
const CAMPOS_COMPARAVEIS = [
  'taxRegime',
  'segment',
  'monthlyFee',
  'classification',
] as const;

function clientePorSchema(schemaName: string): PrismaClient {
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.set('schema', schemaName);
  return new PrismaClient({ datasources: { db: { url: url.toString() } } });
}

function pct(parte: number, total: number): string {
  if (total === 0) return '—';
  return `${((parte / total) * 100).toFixed(1)}%`;
}

async function diagnosticarTenant(nome: string, tenantId: string) {
  const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
  const prisma = clientePorSchema(schemaName);

  try {
    const [ciclos, clientes, snapshots] = await Promise.all([
      prisma.managementCycle.findMany({
        orderBy: [{ year: 'asc' }, { month: 'asc' }],
      }),
      prisma.client.findMany(),
      prisma.clientCycleSnapshot.findMany(),
    ]);

    console.log(`\n${'='.repeat(70)}`);
    console.log(`ESCRITÓRIO: ${nome}`);
    console.log(`${'='.repeat(70)}`);
    console.log(
      `Ciclos: ${ciclos.length}  ·  Clientes: ${clientes.length}  ·  Snapshots: ${snapshots.length}`,
    );

    if (ciclos.length === 0 || snapshots.length === 0) {
      console.log('Sem ciclos ou sem snapshots — nada a comparar aqui.');
      return;
    }

    const rotuloCiclo = (id: string) => {
      const c = ciclos.find((x) => x.id === id);
      return c ? `${String(c.month).padStart(2, '0')}/${c.year}` : id;
    };

    // ---------------------------------------------------------------
    // 1. Divergência entre o congelado e o vivo
    // ---------------------------------------------------------------
    const clientePorId = new Map(clientes.map((c) => [c.id, c]));
    const divergencias: Record<string, number> = {};
    let snapshotsDivergentes = 0;

    for (const snap of snapshots) {
      const cliente = clientePorId.get(snap.clientId);
      if (!cliente) continue;
      let divergiu = false;
      for (const campo of CAMPOS_COMPARAVEIS) {
        const congelado = (snap as any)[campo];
        const vivo = (cliente as any)[campo];
        if (congelado == null && vivo == null) continue;
        if (String(congelado) !== String(vivo)) {
          divergencias[campo] = (divergencias[campo] || 0) + 1;
          divergiu = true;
        }
      }
      if (divergiu) snapshotsDivergentes += 1;
    }

    console.log(`\n[1] CONGELADO x VIVO`);
    console.log(
      `    Snapshots que já divergem do cadastro atual: ${snapshotsDivergentes} de ${snapshots.length} (${pct(snapshotsDivergentes, snapshots.length)})`,
    );
    for (const campo of CAMPOS_COMPARAVEIS) {
      if (divergencias[campo]) {
        console.log(`      · ${campo}: ${divergencias[campo]} divergências`);
      }
    }
    if (snapshotsDivergentes === 0) {
      console.log(
        '    → Nenhuma divergência: até agora o snapshot é só uma cópia do vivo.',
      );
    } else {
      console.log(
        '    → O snapshot JÁ carrega história própria. Editar só o Client apagaria isso.',
      );
    }

    // ---------------------------------------------------------------
    // 2. O mesmo cliente mudou de valor entre ciclos?
    // ---------------------------------------------------------------
    const porCliente = new Map<string, typeof snapshots>();
    for (const snap of snapshots) {
      const lista = porCliente.get(snap.clientId) || [];
      lista.push(snap);
      porCliente.set(snap.clientId, lista);
    }

    const mudancas: { cliente: string; campo: string; de: string; para: string }[] =
      [];
    for (const [clientId, lista] of porCliente) {
      const porCicloFrente = new Map<string, typeof snapshots>();
      for (const s of lista) {
        const chave = s.frontId || 'sem-frente';
        const l = porCicloFrente.get(chave) || [];
        l.push(s);
        porCicloFrente.set(chave, l);
      }
      for (const [, doFront] of porCicloFrente) {
        const ordenados = doFront.sort((a, b) => {
          const ca = ciclos.find((c) => c.id === a.cycleId);
          const cb = ciclos.find((c) => c.id === b.cycleId);
          if (!ca || !cb) return 0;
          return ca.year - cb.year || ca.month - cb.month;
        });
        for (let i = 1; i < ordenados.length; i++) {
          for (const campo of CAMPOS_COMPARAVEIS) {
            const anterior = (ordenados[i - 1] as any)[campo];
            const atual = (ordenados[i] as any)[campo];
            if (anterior == null && atual == null) continue;
            if (String(anterior) !== String(atual)) {
              mudancas.push({
                cliente: clientePorId.get(clientId)?.name || clientId,
                campo,
                de: `${rotuloCiclo(ordenados[i - 1].cycleId)}: ${anterior}`,
                para: `${rotuloCiclo(ordenados[i].cycleId)}: ${atual}`,
              });
            }
          }
        }
      }
    }

    console.log(`\n[2] MUDANÇA ENTRE CICLOS`);
    console.log(`    Ocorrências: ${mudancas.length}`);
    for (const m of mudancas.slice(0, 10)) {
      console.log(`      · ${m.cliente} — ${m.campo}: ${m.de} → ${m.para}`);
    }
    if (mudancas.length > 10) {
      console.log(`      … e mais ${mudancas.length - 10}`);
    }
    if (mudancas.length === 0) {
      console.log(
        '    → Nenhum valor mudou entre ciclos. Ainda não há evidência de dado por competência.',
      );
    } else {
      console.log(
        '    → O dado VARIA por competência. É fato do ciclo, não atributo fixo do cliente.',
      );
    }

    // ---------------------------------------------------------------
    // 3. Dívida de avaliação congelada (anterior ao Bloco B)
    // ---------------------------------------------------------------
    const semClasse = snapshots.filter((s) => !s.complexityClass).length;
    const semDono = snapshots.filter((s) => !s.primaryOwnerId).length;

    console.log(`\n[3] DÍVIDA DE CONGELAMENTO (anterior ao Bloco B)`);
    console.log(
      `    Snapshots sem complexityClass: ${semClasse} de ${snapshots.length} (${pct(semClasse, snapshots.length)})`,
    );
    console.log(
      `    Snapshots sem primaryOwnerId:  ${semDono} de ${snapshots.length} (${pct(semDono, snapshots.length)})`,
    );

    // ---------------------------------------------------------------
    // 4. Leitura sugerida
    // ---------------------------------------------------------------
    console.log(`\n[4] LEITURA`);
    if (ciclos.length <= 1) {
      console.log(
        '    Só existe um ciclo: este escritório ainda não viveu a virada.',
      );
      console.log(
        '    A decisão não pode se apoiar neste tenant — use um com histórico.',
      );
    } else if (mudancas.length > 0 || snapshotsDivergentes > 0) {
      console.log(
        '    Evidência A FAVOR do snapshot como entidade primária de edição:',
      );
      console.log(
        '    o dado já varia por competência e o congelado já difere do vivo.',
      );
    } else {
      console.log(
        '    Sem evidência de variação: o snapshot está sendo usado como cópia.',
      );
      console.log(
        '    Editar no Client e propagar seria suficiente para o uso atual.',
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('DIAGNÓSTICO: cadastro no Client (vivo) x no Snapshot (ciclo)');
  console.log('Somente leitura. Nenhum dado é alterado.\n');

  const tenants = await globalPrisma.tenant.findMany();
  console.log(`${tenants.length} escritórios encontrados.`);

  for (const tenant of tenants) {
    try {
      await diagnosticarTenant(tenant.name, tenant.id);
    } catch (erro: any) {
      console.log(`\n[ERRO] ${tenant.name}: ${erro.message}`);
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('Fim. Leve os números [1] e [2] para a reunião de decisão.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => globalPrisma.$disconnect());
