// Verificação manual do Bloco C (Ordem 01) contra o arquivo real
// docs_cliente/modelo_importacao_completo (1).xlsx.
//
// Roda ImportsService de ponta a ponta com um Prisma FALSO (em memória) no
// lugar do schema do tenant — não escreve nada no banco real. Serve só pra
// provar que o parsing/validação/cálculo funcionam contra a planilha de
// verdade antes de rodar isso contra um tenant de fato.
//
// Uso: npx ts-node -r tsconfig-paths/register scripts/test-import-real-file.ts

import * as path from 'path';
import { ImportsService } from '../src/imports/imports.service';
import { ComplexityService } from '../src/complexity/complexity.service';
import { DashboardService } from '../src/dashboard/dashboard.service';

// xlsx não é dependência do backend (só do frontend, que já faz esse parsing
// client-side) — script de verificação pontual, então reaproveita via
// require em vez de adicionar a lib ao backend por causa de um script.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require(path.join(__dirname, '../../frontend/node_modules/xlsx'));

const FILE_PATH = path.join(
  __dirname,
  '../../docs_cliente/modelo_importacao_completo (1).xlsx',
);

function buildFakeTenantPrisma() {
  const clients = new Map<string, any>();
  const classifications = new Map<string, any>();
  const taxInfos = new Map<string, any>();
  const accountingInfos = new Map<string, any>();
  const snapshots: any[] = [];
  let seq = 0;
  const nextId = (prefix: string) => `${prefix}-${++seq}`;

  return {
    operationalFront: {
      findMany: () => [
        { id: 'front-fiscal', name: 'Fiscal', status: 'ACTIVE' },
        { id: 'front-contabil', name: 'Contábil', status: 'ACTIVE' },
        { id: 'front-dp', name: 'DP', status: 'ACTIVE' },
      ],
    },
    employee: {
      findMany: () => [
        { id: 'emp-vitor', name: 'Vitor Silva', status: 'ACTIVE' },
        { id: 'emp-joao', name: 'João Souza', status: 'ACTIVE' },
      ],
    },
    client: {
      findUnique: ({ where: { cnpj } }: any) =>
        [...clients.values()].find((c) => c.cnpj === cnpj) || null,
      create: ({ data }: any) => {
        const record = { id: nextId('client'), ...data };
        clients.set(record.id, record);
        return record;
      },
      update: ({ where: { id }, data }: any) => {
        const record = { ...clients.get(id), ...data };
        clients.set(id, record);
        return record;
      },
    },
    clientFrontClassification: {
      findUnique: ({ where: { clientId_frontId } }: any) =>
        [...classifications.values()].find(
          (c) =>
            c.clientId === clientId_frontId.clientId &&
            c.frontId === clientId_frontId.frontId,
        ) || null,
      findMany: ({ where }: any = {}) =>
        [...classifications.values()]
          .filter((c) => !where?.frontId || c.frontId === where.frontId)
          .filter(
            (c) => !where?.actsInFront || c.actsInFront === where.actsInFront,
          )
          .map((c) => ({ ...c, client: clients.get(c.clientId) })),
      create: ({ data }: any) => {
        const record = { id: nextId('cfc'), ...data };
        classifications.set(record.id, record);
        return record;
      },
      update: ({ where: { id }, data }: any) => {
        const record = { ...classifications.get(id), ...data };
        classifications.set(id, record);
        return record;
      },
    },
    clientTaxInfo: {
      upsert: ({ where: { classificationId }, create, update }: any) => {
        const existing = taxInfos.get(classificationId);
        const record = existing
          ? { ...existing, ...update }
          : { id: nextId('taxinfo'), ...create };
        taxInfos.set(classificationId, record);
        return record;
      },
    },
    clientAccountingInfo: {
      upsert: ({ where: { classificationId }, create, update }: any) => {
        const existing = accountingInfos.get(classificationId);
        const record = existing
          ? { ...existing, ...update }
          : { id: nextId('accinfo'), ...create };
        accountingInfos.set(classificationId, record);
        return record;
      },
    },
    clientCycleSnapshot: {
      findFirst: () => null,
      findMany: ({ where }: any = {}) =>
        snapshots
          .filter((s) => !where?.cycleId || s.cycleId === where.cycleId)
          .filter((s) => !where?.frontId || s.frontId === where.frontId)
          .map((s) => ({ ...s, client: clients.get(s.clientId) })),
      create: ({ data }: any) => {
        const record = { id: nextId('snapshot'), ...data };
        snapshots.push(record);
        return record;
      },
    },
    __dump: () => ({
      clients: [...clients.values()],
      classifications: [...classifications.values()],
      taxInfos: [...taxInfos.values()],
      accountingInfos: [...accountingInfos.values()],
      snapshots,
    }),
  };
}

async function main() {
  const wb = XLSX.readFile(FILE_PATH);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  console.log(
    `Lidas ${rows.length} linha(s) de "${path.basename(FILE_PATH)}".`,
  );

  const fakePrisma = buildFakeTenantPrisma();
  const fakePrismaManager = { getClient: () => fakePrisma } as any;
  const fakeGlobalPrisma = {} as any;
  const complexityService = new ComplexityService();
  const service = new ImportsService(
    fakeGlobalPrisma,
    fakePrismaManager,
    complexityService,
  );

  const result = await service.importClientsJson(
    'fake-tenant',
    rows,
    'fake-cycle',
    path.basename(FILE_PATH),
    2,
  );

  console.log('\n=== Resultado da importação ===');
  console.log(JSON.stringify(result, null, 2));

  console.log(
    '\n=== Estado final (em memória, nada gravado no banco real) ===',
  );
  console.log(JSON.stringify((fakePrisma as any).__dump(), null, 2));

  // Bloco D: prova que o Diagnóstico lê corretamente a carteira recém
  // importada (via snapshot, já que cycleId foi passado acima) — sem
  // nenhuma Delivery envolvida.
  const dashboardService = new DashboardService(
    fakeGlobalPrisma,
    fakePrismaManager,
    complexityService,
  );
  for (const front of ['front-fiscal', 'front-contabil', 'front-dp']) {
    const mapping = await dashboardService.getCycleMapping(
      'fake-tenant',
      'fake-cycle',
      front,
    );
    console.log(`\n=== Diagnóstico (getCycleMapping) — ${front} ===`);
    console.log(JSON.stringify(mapping, null, 2));
  }

  // O arquivo real só tem 1 linha e nenhuma nota (Complexidade legada),
  // então nunca gera ASSESSED — insuficiente para provar curva/CCA/CCR na
  // ponta. Injeta manualmente mais 4 classificações direto no Prisma fake
  // (mesmo padrão dos testes unitários do Bloco B) só pra checar que a
  // agregação do getCycleMapping bate com o esperado.
  console.log(
    '\n=== Cenário sintético (fora do arquivo real): curva/CCA/CCR ===',
  );
  const createdExtraClients = [1, 2, 3, 4].map(() =>
    (fakePrisma as any).client.create({ data: { status: 'ACTIVE' } }),
  );
  const scores = [
    { front: 'FISCAL' as const, s: [1, 1, 1, 1], owner: 'emp-vitor' }, // C1
    { front: 'FISCAL' as const, s: [3, 3, 3, 3], owner: 'emp-vitor' }, // C5
    { front: 'FISCAL' as const, s: [2, 2, 2, 2], owner: 'emp-joao' }, // C3
    { front: 'FISCAL' as const, s: [2, 2, 2, 1], owner: 'emp-joao' }, // C2
  ];
  createdExtraClients.forEach((client: any, idx: number) => {
    const { s, owner } = scores[idx];
    const evaluation = complexityService.evaluate({
      front: 'FISCAL',
      actsInFront: 'YES',
      clientStatus: 'ACTIVE',
      scores: {
        scoreVolume: s[0],
        scoreService: s[1],
        scoreTax: s[2],
        scoreOrganization: s[3],
      },
    });
    (fakePrisma as any).clientFrontClassification.create({
      data: {
        clientId: client.id,
        frontId: 'front-fiscal',
        actsInFront: 'YES',
        operator1Id: owner,
        ...evaluation,
      },
    });
  });
  const syntheticMapping = await dashboardService.getCycleMapping(
    'fake-tenant',
    'cycle-without-snapshot', // cycleId sem snapshot -> cai no fallback (D1, prioridade 2)
    'front-fiscal',
  );
  console.log(JSON.stringify(syntheticMapping, null, 2));
}

main().catch((err) => {
  console.error('Falhou:', err);
  process.exit(1);
});
