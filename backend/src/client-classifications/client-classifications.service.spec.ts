import { ClientClassificationsService } from './client-classifications.service';
import { ComplexityService } from '../complexity/complexity.service';

function buildDeps(existingClassification: Partial<any>) {
  const classificationRow = {
    id: 'classification-1',
    scoreVolume: null,
    scoreService: null,
    scoreTax: null,
    scoreOrganization: null,
    scoreTurnover: null,
    assessmentState: 'NOT_ASSESSED',
    taxInfo: null,
    hrInfo: null,
    accountingInfo: null,
    ...existingClassification,
  };

  const updateMock = jest
    .fn()
    .mockImplementation((args) => Promise.resolve({ ...classificationRow, ...args.data }));

  const tenantPrisma = {
    clientFrontClassification: {
      findUnique: jest.fn().mockResolvedValue(classificationRow),
      create: jest.fn().mockResolvedValue(classificationRow),
      update: updateMock,
    },
    client: {
      findUnique: jest.fn().mockResolvedValue({ status: 'ACTIVE' }),
    },
  };

  const prismaManager = {
    getClient: jest.fn().mockReturnValue(tenantPrisma),
  } as any;

  const service = new ClientClassificationsService(prismaManager, new ComplexityService());
  return { service, tenantPrisma, updateMock };
}

describe('ClientClassificationsService.updateClassification — motor de complexidade', () => {
  it('Fiscal: calcula scoreVolume e o motor a partir de monthlyNotesCount informado em tela', async () => {
    const { service, updateMock } = buildDeps({});

    await service.updateClassification('tenant-1', 'client-1', 'front-1', {
      frontType: 'FISCAL',
      taxInfo: { monthlyNotesCount: '180' },
    });

    const savedData = updateMock.mock.calls[0][0].data;
    expect(savedData.scoreVolume).toBe(2); // 180 está na faixa 51-200
    expect(savedData.volumeSource).toBe('CALCULATED');
    // só Volume preenchido entre os 4 critérios da Fiscal -> PARTIAL, nunca C0/ASSESSED
    expect(savedData.assessmentState).toBe('PARTIAL');
  });

  it('Pessoal: soma funcionários + pró-labores + domésticas como driver de Volume', async () => {
    const { service, updateMock } = buildDeps({});

    await service.updateClassification('tenant-1', 'client-1', 'front-1', {
      frontType: 'HR',
      hrInfo: { employeesCount: '30', prolaboreCount: '3', domesticsCount: '2' },
    });

    const savedData = updateMock.mock.calls[0][0].data;
    // 35 vínculos -> faixa 11-50 -> nota 2
    expect(savedData.scoreVolume).toBe(2);
  });

  it('não recalcula nada do motor quando frontType não é reconhecido (OTHER)', async () => {
    const { service, updateMock } = buildDeps({});

    await service.updateClassification('tenant-1', 'client-1', 'front-1', {
      frontType: 'OTHER',
      particulars: 'só um texto livre',
    });

    const savedData = updateMock.mock.calls[0][0].data;
    expect(savedData.scoreVolume).toBeUndefined();
    expect(savedData.assessmentState).toBeUndefined();
  });

  it('preserva assessmentState=AI_SUGGESTED mesmo se o Volume mudar — não confirma sozinho', async () => {
    const { service, updateMock } = buildDeps({
      assessmentState: 'AI_SUGGESTED',
      scoreService: 1,
      scoreTax: 1,
      scoreOrganization: 1,
    });

    await service.updateClassification('tenant-1', 'client-1', 'front-1', {
      frontType: 'FISCAL',
      taxInfo: { monthlyNotesCount: '10' },
    });

    const savedData = updateMock.mock.calls[0][0].data;
    // rawSum/normalizedScore/complexityClass são recalculados (dado novo)...
    expect(savedData.complexityClass).toBe('C1');
    // ...mas o estado de governança não pula pra ASSESSED sem confirmação humana.
    expect(savedData.assessmentState).toBeUndefined();
  });

  it('preserva as notas já existentes (scoreService/Tax/Organization) ao só editar o Volume', async () => {
    const { service, updateMock } = buildDeps({
      scoreService: 2,
      scoreTax: 2,
      scoreOrganization: 2,
    });

    await service.updateClassification('tenant-1', 'client-1', 'front-1', {
      frontType: 'FISCAL',
      taxInfo: { monthlyNotesCount: '30' },
    });

    const savedData = updateMock.mock.calls[0][0].data;
    // Volume(1) + Service(2) + Tax(2) + Organization(2) = 7 -> C2
    expect(savedData.scoreVolume).toBe(1);
    expect(savedData.assessmentState).toBe('ASSESSED');
    expect(savedData.complexityClass).toBe('C2');
  });
});
