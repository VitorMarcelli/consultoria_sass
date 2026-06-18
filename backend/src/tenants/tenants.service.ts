import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

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
      
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."OperationalFront" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'ACTIVE',
            "observations" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "OperationalFront_pkey" PRIMARY KEY ("id")
        )
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."Employee" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "email" TEXT,
            "role" TEXT NOT NULL,
            "level" TEXT,
            "grossSalary" DOUBLE PRECISION,
            "status" TEXT NOT NULL DEFAULT 'ACTIVE',
            "observations" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
        )
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."Subdivision" (
            "id" TEXT NOT NULL,
            "frontId" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "leaderId" TEXT,
            "status" TEXT NOT NULL DEFAULT 'ACTIVE',
            "observations" TEXT,
            CONSTRAINT "Subdivision_pkey" PRIMARY KEY ("id")
        )
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."ManagementCycle" (
            "id" TEXT NOT NULL,
            "month" INTEGER NOT NULL,
            "year" INTEGER NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'OPEN',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "ManagementCycle_pkey" PRIMARY KEY ("id")
        )
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."EmployeeCycleAllocation" (
            "id" TEXT NOT NULL,
            "cycleId" TEXT NOT NULL,
            "employeeId" TEXT NOT NULL,
            "frontId" TEXT NOT NULL,
            "subdivisionId" TEXT,
            "leaderId" TEXT,
            "dailyAvailableTime" DOUBLE PRECISION,
            "predictableRecurrentTimePercentage" DOUBLE PRECISION,
            "unpredictableRecurrentTimePercentage" DOUBLE PRECISION,
            "allocationStartDate" TIMESTAMP(3),
            "allocationEndDate" TIMESTAMP(3),
            "status" TEXT NOT NULL DEFAULT 'ACTIVE',
            "observations" TEXT,
            CONSTRAINT "EmployeeCycleAllocation_pkey" PRIMARY KEY ("id")
        )
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."ClientCycleSnapshot" (
            "id" TEXT NOT NULL,
            "cycleId" TEXT NOT NULL,
            "clientId" TEXT NOT NULL,
            "frontId" TEXT NOT NULL,
            "subdivisionId" TEXT,
            "taxRegime" TEXT,
            "segment" TEXT,
            "monthlyFee" DOUBLE PRECISION,
            "classification" TEXT,
            "complexity" INTEGER,
            "frequency" TEXT,
            "particulars" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "ClientCycleSnapshot_pkey" PRIMARY KEY ("id")
        )
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."Client" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "tradeName" TEXT,
          "cnpj" TEXT,
          "city" TEXT,
          "state" TEXT,
          "taxRegime" TEXT,
          "segment" TEXT,
          "revenueBracket" TEXT,
          "hasEconomicGroup" BOOLEAN NOT NULL DEFAULT false,
          "economicGroupName" TEXT,
          "email" TEXT,
          "phone" TEXT,
          "contactName" TEXT,
          "address" TEXT,
          "neighborhood" TEXT,
          "zipCode" TEXT,
          "ie" TEXT,
          "im" TEXT,
          "cnae" TEXT,
          "foundationDate" TIMESTAMP(3),
          "certificateExpiration" TIMESTAMP(3),
          "status" TEXT NOT NULL DEFAULT 'ACTIVE',
          "monthlyFee" DOUBLE PRECISION,
          "classification" TEXT,
          "observations" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
        )
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."ClientFrontClassification" (
            "id" TEXT NOT NULL,
            "clientId" TEXT NOT NULL,
            "frontId" TEXT NOT NULL,
            "actsInFront" TEXT NOT NULL,
            "leaderId" TEXT,
            "operator1Id" TEXT,
            "operator2Id" TEXT,
            "frequency" TEXT,
            "complexity" INTEGER,
            "particulars" TEXT,
            CONSTRAINT "ClientFrontClassification_pkey" PRIMARY KEY ("id")
        )
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."ClientTaxInfo" (
            "id" TEXT NOT NULL,
            "classificationId" TEXT NOT NULL,
            CONSTRAINT "ClientTaxInfo_pkey" PRIMARY KEY ("id")
        )
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."ClientHrInfo" (
            "id" TEXT NOT NULL,
            "classificationId" TEXT NOT NULL,
            CONSTRAINT "ClientHrInfo_pkey" PRIMARY KEY ("id")
        )
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."ClientAccountingInfo" (
            "id" TEXT NOT NULL,
            "classificationId" TEXT NOT NULL,
            CONSTRAINT "ClientAccountingInfo_pkey" PRIMARY KEY ("id")
        )
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."Delivery" (
            "id" TEXT NOT NULL,
            "clientId" TEXT NOT NULL,
            "frontId" TEXT NOT NULL,
            "subdivisionId" TEXT,
            "competence" TEXT NOT NULL,
            "originalName" TEXT NOT NULL,
            "standardizedName" TEXT NOT NULL,
            "deliveryClass" TEXT,
            "deliveryGroup" TEXT,
            "deliveryType" TEXT,
            "periodicity" TEXT,
            "responsibleId" TEXT NOT NULL,
            "leaderId" TEXT,
            "status" TEXT NOT NULL DEFAULT 'PREVISTA',
            "legalDeadline" TIMESTAMP(3),
            "internalDeadline" TIMESTAMP(3),
            "executionDeadline" TIMESTAMP(3),
            "observations" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
        )
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."TimeReview" (
            "id" TEXT NOT NULL,
            "deliveryId" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "TimeReview_pkey" PRIMARY KEY ("id")
        )
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "Client_cnpj_key" ON "${schemaName}"."Client"("cnpj")
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "ClientFrontClassification_clientId_frontId_key" ON "${schemaName}"."ClientFrontClassification"("clientId", "frontId")
      `);

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
