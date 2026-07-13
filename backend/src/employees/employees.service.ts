import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientManager } from '../prisma/prisma-client-manager';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly globalPrisma: PrismaService,
    private readonly prismaManager: PrismaClientManager,
  ) {}

  private getTenantPrisma(tenantId: string) {
    if (!tenantId) throw new NotFoundException('ID do escritório não informado.');
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  async findAll(tenantId: string) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    return tenantPrisma.employee.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, data: any) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    
    // Helper to safely parse floats
    const safeParseFloat = (val: any, fallback: any = null) => {
      if (val === null || val === undefined || val === '') return fallback;
      const parsed = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : parseFloat(val);
      return isNaN(parsed) ? fallback : parsed;
    };

    // Helper to safely parse dates
    const safeParseDate = (val: any) => {
      if (!val || val === '') return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    let authUserId: string | null = null;
    if (data.createAccount && data.email) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        throw new BadRequestException('Configuração do Supabase ausente no servidor.');
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: 'Sevilha123!', // Senha inicial padrão
        email_confirm: true,
        user_metadata: { name: data.name }
      });

      if (authError) {
        throw new BadRequestException(`Erro ao criar conta no Supabase: ${authError.message}`);
      }
      authUserId = authData.user.id;
    }

    // Inicia uma transação para garantir que a criação do funcionário e sua alocação no ciclo (se houver) aconteçam de forma segura.
    const result = await tenantPrisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          name: data.name,
          email: data.email || null,
          role: data.role,
          level: data.level || null,
          status: data.status || 'ACTIVE',
          grossSalary: safeParseFloat(data.grossSalary),
          observations: data.observations || null,
        }
      });

      if (data.cycleId && data.frontId) {
        await tx.employeeCycleAllocation.create({
          data: {
            employeeId: employee.id,
            cycleId: data.cycleId,
            frontId: data.frontId,
            subdivisionId: data.subdivisionId || null,
            dailyAvailableTime: safeParseFloat(data.allocatedHours, 8),
            predictableRecurrentTimePercentage: safeParseFloat(data.predictableRecurrentTimePercentage),
            unpredictableRecurrentTimePercentage: safeParseFloat(data.unpredictableRecurrentTimePercentage),
            allocationStartDate: safeParseDate(data.allocationStartDate),
            allocationEndDate: safeParseDate(data.allocationEndDate),
            status: data.allocationStatus || 'ACTIVE',
          }
        });
      }

      return employee;
    });

    if (authUserId) {
      await this.globalPrisma.user.create({
        data: {
          id: authUserId,
          email: data.email,
          name: data.name,
          role: 'OPERATOR',
          tenantId: tenantId,
          employeeId: result.id
        }
      });
    }

    return result;
  }

  async update(tenantId: string, employeeId: string, data: any) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    return tenantPrisma.employee.update({
      where: { id: employeeId },
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        level: data.level !== undefined ? data.level : undefined,
        status: data.status,
        grossSalary: data.grossSalary !== undefined ? (data.grossSalary?.toString().trim() ? parseFloat(data.grossSalary) : null) : undefined,
        observations: data.observations !== undefined ? data.observations : undefined,
      }
    });
  }

  async remove(tenantId: string, employeeId: string) {
    const tenantPrisma = await this.getTenantPrisma(tenantId);
    
    // Verificar se o colaborador está vinculado a algum cliente em uma frente
    const linkedClients = await tenantPrisma.clientFrontClassification.findMany({
      where: {
        OR: [
          { leaderId: employeeId },
          { operator1Id: employeeId },
          { operator2Id: employeeId }
        ]
      },
      include: {
        client: true
      }
    });

    if (linkedClients.length > 0) {
      const clientNames = Array.from(new Set(linkedClients.map(c => c.client.name)));
      throw new BadRequestException(`Não é possível excluir este colaborador, pois ele está vinculado à operação dos seguintes clientes: ${clientNames.join(', ')}.`);
    }

    return tenantPrisma.employee.delete({
      where: { id: employeeId }
    });
  }
}
