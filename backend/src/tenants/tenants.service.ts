import { Injectable, ConflictException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

@Injectable()
export class TenantsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Inicia a sincronização em background sem bloquear o startup do NestJS
    this.syncAllSchemasInBackground().catch(console.error);
  }

  private async syncAllSchemasInBackground() {
    console.log('Iniciando sincronização automática de schemas de tenants (Background)...');
    try {
      const tenants = await this.prisma.tenant.findMany();
      for (const tenant of tenants) {
        const schemaName = `tenant_${tenant.id.replace(/-/g, '_')}`;
        console.log(`Sincronizando schema para o tenant: ${tenant.name} (${schemaName})...`);
        try {
          await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}";`);
          
          const dbUrl = new URL(process.env.DATABASE_URL!);
          dbUrl.searchParams.set('schema', schemaName);
          
          const directUrl = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL!);
          directUrl.searchParams.set('schema', schemaName);

          // Executa de forma assíncrona para não travar o event loop
          await execAsync('npx prisma db push --accept-data-loss --skip-generate', {
            env: {
              ...process.env,
              DATABASE_URL: dbUrl.toString(),
              DIRECT_URL: directUrl.toString(),
            }
          });
          console.log(`Schema ${schemaName} sincronizado com sucesso.`);
        } catch (err: any) {
          console.error(`Erro ao sincronizar schema ${schemaName}:`, err?.message || err);
        }
      }
      console.log('Sincronização de todos os schemas concluída com sucesso!');
    } catch (err: any) {
      console.error('Erro geral ao buscar tenants para sincronização:', err?.message || err);
    }
  }

  async create(data: { name: string; cnpj?: string; slug: string; consultantId?: string }) {
    // 1. Verify if slug or cnpj already exists
    const existingSlug = await this.prisma.tenant.findUnique({
      where: { slug: data.slug },
    });
    if (existingSlug) {
      throw new ConflictException('Slug já está em uso');
    }

    if (data.cnpj) {
      const existingCnpj = await this.prisma.tenant.findUnique({
        where: { cnpj: data.cnpj },
      });
      if (existingCnpj) {
        throw new ConflictException('CNPJ já cadastrado');
      }
    }

    // 2. Create the Tenant in the public schema
    const cleanData = {
      ...data,
      consultantId: data.consultantId || undefined,
    };
    const tenant = await this.prisma.tenant.create({ data: cleanData });

    // 3. Dynamically create the database schema and Client table for the new Tenant
    // Replace hyphens with underscores because Postgres schema names cannot contain hyphens easily
    const schemaName = `tenant_${tenant.id.replace(/-/g, '_')}`;

    try {
      await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}";`);
      
      const dbUrl = new URL(process.env.DATABASE_URL!);
      dbUrl.searchParams.set('schema', schemaName);
      
      const directUrl = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL!);
      directUrl.searchParams.set('schema', schemaName);

      execSync('npx prisma db push --accept-data-loss --skip-generate', {
        env: {
          ...process.env,
          DATABASE_URL: dbUrl.toString(),
          DIRECT_URL: directUrl.toString(),
        },
        stdio: 'pipe' // Keep it quiet unless error
      });

      console.log(`Schema e tabelas criadas dinamicamente para o Tenant: ${tenant.name} (${schemaName})`);
    } catch (err: any) {
      console.error(`Erro ao criar schema para o tenant ${tenant.id}:`, err);
      // Cleanup the tenant record if schema creation fails
      await this.prisma.tenant.delete({ where: { id: tenant.id } });
      throw new Error(`Erro ao criar estruturas de banco de dados para a empresa: ${err?.message || 'Erro desconhecido'}`);
    }

    return tenant;
  }

  async findAll(user?: any) {
    const whereClause: any = {};
    
    if (user && user.id) {
      const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
      if (dbUser && dbUser.role === 'CONSULTANT') {
        whereClause.consultantId = dbUser.id;
      }
    }

    return this.prisma.tenant.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { users: true },
        },
        consultant: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: { users: true, consultant: true },
    });
  }

  async update(id: string, data: { 
    name?: string; 
    cnpj?: string; 
    consultantId?: string; 
    status?: string;
    city?: string;
    state?: string;
    size?: string;
    accountingSystem?: string;
    observations?: string;
  }) {
    // Determine the consultant connection behavior
    const consultantData = data.consultantId
      ? { connect: { id: data.consultantId } }
      : data.consultantId === '' // Handle the 'Ninguém' case
      ? { disconnect: true }
      : undefined;

    return this.prisma.tenant.update({
      where: { id },
      data: {
        name: data.name,
        cnpj: data.cnpj,
        status: data.status,
        city: data.city,
        state: data.state,
        size: data.size,
        accountingSystem: data.accountingSystem,
        observations: data.observations,
        ...(data.consultantId !== undefined && { consultant: consultantData }),
      },
      include: { consultant: true }
    });
  }

  async getTemplates(tenantId: string) {
    return this.prisma.tenantTemplate.findMany({
      where: { tenantId }
    });
  }

  async updateTemplateStatus(tenantId: string, data: { layer: number; templateName: string; status: string; fileUrl?: string }) {
    return this.prisma.tenantTemplate.upsert({
      where: {
        tenantId_templateName: {
          tenantId,
          templateName: data.templateName
        }
      },
      create: {
        tenantId,
        layer: data.layer,
        templateName: data.templateName,
        status: data.status,
        fileUrl: data.fileUrl
      },
      update: {
        status: data.status,
        fileUrl: data.fileUrl,
        layer: data.layer
      }
    });
  }

  async remove(id: string) {
    // Drop the tenant's dynamic schema
    const schemaName = `tenant_${id.replace(/-/g, '_')}`;
    try {
      await this.prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`);
      console.log(`Schema ${schemaName} removido com sucesso.`);
    } catch (err) {
      console.error(`Erro ao remover schema ${schemaName}:`, err);
    }

    // Delete the tenant record (Prisma will cascade delete relations if configured, or just the tenant)
    return this.prisma.tenant.delete({
      where: { id }
    });
  }
}
