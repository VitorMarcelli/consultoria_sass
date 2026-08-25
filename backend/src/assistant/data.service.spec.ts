import { AssistantDataService } from './data.service';

function buildTenantPrisma(overrides: Partial<any> = {}) {
  return {
    managementCycle: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    operationalFront: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'front-fiscal', name: 'Fiscal', status: 'ACTIVE' },
        { id: 'front-contabil', name: 'Contábil', status: 'ACTIVE' },
        { id: 'front-pessoal', name: 'Pessoal', status: 'ACTIVE' },
      ]),
    },
    clientFrontClassification: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    client: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    ...overrides,
  };
}

function buildService(tenantPrisma: any, dashboardService: any = {}) {
  const prismaManager = { getClient: jest.fn().mockReturnValue(tenantPrisma) } as any;
  return new AssistantDataService(prismaManager, dashboardService as any);
}

describe('AssistantDataService — nunca inventa dado quando falta contexto', () => {
  it('portfolioOverview retorna erro explícito quando não há ciclo aberto', async () => {
    const service = buildService(buildTenantPrisma());
    const result = await service.portfolioOverview('tenant-1');
    expect(result).toEqual({
      error: 'Nenhum ciclo de gestão aberto para este escritório ainda.',
    });
  });

  it('capacityOverview retorna erro explícito quando não há ciclo aberto', async () => {
    const service = buildService(buildTenantPrisma());
    const result = await service.capacityOverview('tenant-1');
    expect(result).toEqual({
      error: 'Nenhum ciclo de gestão aberto para este escritório ainda.',
    });
  });

  it('portfolioOverview retorna erro quando a frente pedida não existe', async () => {
    const tenantPrisma = buildTenantPrisma({
      managementCycle: {
        findFirst: jest.fn().mockResolvedValue({ id: 'cycle-1', month: 8, year: 2026 }),
      },
    });
    const service = buildService(tenantPrisma);
    const result = await service.portfolioOverview('tenant-1', 'Frente Inexistente');
    expect(result).toEqual({
      error: 'Frente "Frente Inexistente" não encontrada neste escritório.',
    });
  });

  it('clientDetail retorna erro quando o cliente não é encontrado', async () => {
    const service = buildService(buildTenantPrisma());
    const result = await service.clientDetail('tenant-1', 'Empresa Que Não Existe');
    expect(result).toEqual({
      error: 'Nenhum cliente encontrado com o nome "Empresa Que Não Existe".',
    });
  });
});

describe('AssistantDataService — isolamento de tenant', () => {
  it('resolve o schema do tenant certo a partir do tenantId, nunca de um parâmetro da IA', async () => {
    const tenantPrisma = buildTenantPrisma();
    const prismaManager = { getClient: jest.fn().mockReturnValue(tenantPrisma) } as any;
    const service = new AssistantDataService(prismaManager, {} as any);

    await service.portfolioOverview('7af4378c-836b-4802-8da6-8bbc9b15fa62');

    expect(prismaManager.getClient).toHaveBeenCalledWith(
      'tenant_7af4378c_836b_4802_8da6_8bbc9b15fa62',
    );
  });
});

describe('AssistantDataService.portfolioOverview — delega pro DashboardService já existente', () => {
  it('chama getCycleMapping para as 3 frentes quando nenhuma é especificada', async () => {
    const tenantPrisma = buildTenantPrisma({
      managementCycle: {
        findFirst: jest.fn().mockResolvedValue({ id: 'cycle-1', month: 8, year: 2026 }),
      },
    });
    const getCycleMapping = jest.fn().mockResolvedValue({ coverage: { totalClients: 1 } });
    const service = buildService(tenantPrisma, { getCycleMapping });

    const result = await service.portfolioOverview('tenant-1');

    expect(getCycleMapping).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ cycle: '8/2026' });
    expect((result as any).fronts).toHaveLength(3);
  });

  it('chama getCycleMapping só para a frente pedida quando especificada', async () => {
    const tenantPrisma = buildTenantPrisma({
      managementCycle: {
        findFirst: jest.fn().mockResolvedValue({ id: 'cycle-1', month: 8, year: 2026 }),
      },
    });
    const getCycleMapping = jest.fn().mockResolvedValue({ coverage: { totalClients: 5 } });
    const service = buildService(tenantPrisma, { getCycleMapping });

    const result = await service.portfolioOverview('tenant-1', 'Fiscal');

    expect(getCycleMapping).toHaveBeenCalledTimes(1);
    expect(getCycleMapping).toHaveBeenCalledWith('tenant-1', 'cycle-1', 'front-fiscal');
    expect((result as any).fronts).toHaveLength(1);
  });
});

describe('AssistantDataService.findClients', () => {
  it('aplica filtro de complexityClass e de ownerName combinados', async () => {
    const classifications = [
      {
        client: { name: 'Empresa A', status: 'ACTIVE' },
        front: { name: 'Fiscal' },
        complexityClass: 'C5',
        assessmentState: 'ASSESSED',
        operator1: { name: 'Ana Analista' },
      },
      {
        client: { name: 'Empresa B', status: 'ACTIVE' },
        front: { name: 'Fiscal' },
        complexityClass: 'C5',
        assessmentState: 'ASSESSED',
        operator1: { name: 'Carlos' },
      },
    ];
    const tenantPrisma = buildTenantPrisma({
      clientFrontClassification: { findMany: jest.fn().mockResolvedValue(classifications) },
    });
    const service = buildService(tenantPrisma);

    const result = await service.findClients('tenant-1', {
      complexityClass: 'c5',
      ownerName: 'ana',
    });

    expect(result.total).toBe(1);
    expect(result.clients[0].name).toBe('Empresa A');
  });
});
