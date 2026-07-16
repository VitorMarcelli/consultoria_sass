import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientManager } from '../prisma/prisma-client-manager';

@Injectable()
export class TimesheetsService {
  constructor(
    private readonly globalPrisma: PrismaService,
    private readonly prismaManager: PrismaClientManager,
  ) {}

  private getTenantPrisma(tenantId: string) {
    if (!tenantId)
      throw new NotFoundException('ID do escritório não informado.');
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  async findAll(tenantId: string, clientId?: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    return tenantPrisma.timeLog.findMany({
      where: clientId ? { clientId } : {},
      include: {
        client: true,
        employee: true,
        delivery: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async startTimer(
    tenantId: string,
    data: {
      clientId: string;
      employeeId: string;
      deliveryId?: string;
      activityDescription?: string;
    },
  ) {
    const tenantPrisma = this.getTenantPrisma(tenantId);

    // Verifica se já existe algum rodando para esse empregado e para
    const activeLog = await tenantPrisma.timeLog.findFirst({
      where: { employeeId: data.employeeId, status: 'RUNNING' },
    });

    if (activeLog) {
      await this.stopTimer(tenantId, activeLog.id);
    }

    return tenantPrisma.timeLog.create({
      data: {
        clientId: data.clientId,
        employeeId: data.employeeId,
        deliveryId: data.deliveryId || null,
        activityDescription: data.activityDescription || 'Timesheet tracking',
        startTime: new Date(),
        status: 'RUNNING',
      },
      include: { client: true, employee: true, delivery: true },
    });
  }

  async stopTimer(tenantId: string, id: string) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    const timeLog = await tenantPrisma.timeLog.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!timeLog)
      throw new NotFoundException('Apontamento de tempo não encontrado.');
    if (timeLog.status === 'FINISHED') return timeLog;

    const endTime = new Date();
    const durationMs = endTime.getTime() - timeLog.startTime.getTime();
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

    // Cálculo do custo com base no salário bruto (estimativa de 160h mensais)
    const grossSalary = timeLog.employee?.grossSalary || 3000; // default 3000
    const costPerHour = grossSalary / 160;
    const costAmount = parseFloat(
      ((costPerHour / 60) * durationMinutes).toFixed(2),
    );

    return tenantPrisma.timeLog.update({
      where: { id },
      data: {
        endTime,
        durationMinutes,
        costAmount,
        status: 'FINISHED',
      },
      include: { client: true, employee: true, delivery: true },
    });
  }

  async createManual(
    tenantId: string,
    data: {
      clientId: string;
      employeeId: string;
      deliveryId?: string;
      activityDescription?: string;
      durationMinutes: number;
    },
  ) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    const employee = await tenantPrisma.employee.findUnique({
      where: { id: data.employeeId },
    });

    const grossSalary = employee?.grossSalary || 3000;
    const costPerHour = grossSalary / 160;
    const costAmount = parseFloat(
      ((costPerHour / 60) * data.durationMinutes).toFixed(2),
    );

    const endTime = new Date();
    const startTime = new Date(
      endTime.getTime() - data.durationMinutes * 60000,
    );

    return tenantPrisma.timeLog.create({
      data: {
        clientId: data.clientId,
        employeeId: data.employeeId,
        deliveryId: data.deliveryId || null,
        activityDescription: data.activityDescription || 'Lancamento manual',
        startTime,
        endTime,
        durationMinutes: data.durationMinutes,
        costAmount,
        status: 'FINISHED',
      },
      include: { client: true, employee: true, delivery: true },
    });
  }

  async calculateContractDre(
    tenantId: string,
    clientId: string,
    userRole: string = 'CONSULTANT',
  ) {
    const tenantPrisma = this.getTenantPrisma(tenantId);
    const client = await tenantPrisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado.');

    const timeLogs = await tenantPrisma.timeLog.findMany({
      where: { clientId, status: 'FINISHED' },
      include: { employee: true, delivery: true },
    });

    const totalMinutes = timeLogs.reduce(
      (acc, log) => acc + (log.durationMinutes || 0),
      0,
    );
    const totalCost = timeLogs.reduce(
      (acc, log) => acc + (log.costAmount || 0),
      0,
    );
    const monthlyFee = client.monthlyFee || 0;
    const netMargin = monthlyFee - totalCost;
    const netMarginPercent =
      monthlyFee > 0
        ? parseFloat(((netMargin / monthlyFee) * 100).toFixed(1))
        : 0;

    return {
      client: { id: client.id, name: client.name, monthlyFee },
      totalDurationHours: parseFloat((totalMinutes / 60).toFixed(1)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      netMargin: parseFloat(netMargin.toFixed(2)),
      netMarginPercent,
      // Se for ADMIN ou LEADER, enviamos os logs detalhados com salários, senão filtramos
      detailedLogs: timeLogs.map((log) => ({
        id: log.id,
        activityDescription: log.activityDescription,
        durationMinutes: log.durationMinutes,
        startTime: log.startTime,
        employeeName: log.employee?.name,
        // Oculta o custo unitário se for consultor base para proteger sigilo salarial
        costAmount: ['ADMIN', 'LEADER'].includes(userRole)
          ? log.costAmount
          : undefined,
      })),
    };
  }
}
