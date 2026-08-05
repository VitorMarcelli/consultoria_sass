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
}

main().catch((err) => {
  console.error('Falhou:', err);
  process.exit(1);
});
