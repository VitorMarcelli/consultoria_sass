import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createClient } from '@supabase/supabase-js';
import { CreateConsultantDto } from './dto/create-consultant.dto';
import * as jwt from 'jsonwebtoken';

import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantsService: TenantsService
  ) {}

  async findMe(userId: string, email?: string) {
    let user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            cnpj: true,
          },
        },
      },
    });

    if (!user && email) {
      // Try finding by email in case of ID mismatch (e.g. Supabase recreated user)
      user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          tenant: {
            select: { id: true, name: true, slug: true, cnpj: true }
          }
        }
      });
      
      if (user) {
        // Update the ID to match Supabase's new ID
        // Note: Prisma might not allow updating the primary key directly depending on the version/schema, 
        // but we can try using executeRaw if update fails, or simply create a new user if we delete the old one.
        try {
          await this.prisma.$executeRaw`UPDATE "User" SET id = ${userId} WHERE email = ${email}`;
          user.id = userId;
        } catch (e) {
          console.error('Failed to update User ID:', e);
        }
      }
    }

    if (!user) {
      // Auto-recover if user doesn't exist
      let defaultTenant = await this.prisma.tenant.findFirst();
      if (!defaultTenant) {
        defaultTenant = await this.prisma.tenant.create({
          data: {
            name: 'Consultoria Principal',
            slug: 'consultoria-principal',
            status: 'ACTIVE'
          }
        });
      }

      try {
        user = await this.prisma.user.create({
          data: {
            id: userId,
            email: email || 'usuario@recuperado.com',
            name: 'Consultor Recuperado',
            tenantId: defaultTenant.id,
            role: 'CONSULTANT'
          },
          include: {
            tenant: {
              select: { id: true, name: true, slug: true, cnpj: true }
            }
          }
        });
      } catch (err: any) {
         // In case of unique constraint error (another user has the email but different ID)
         console.error('Error creating user recovery:', err);
         throw err;
      }
    }

    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findAllByTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async updateRole(requesterId: string, targetId: string, role: 'ADMIN' | 'LEADER' | 'CONSULTANT') {
    const requester = await this.prisma.user.findUnique({ where: { id: requesterId } });
    const target = await this.prisma.user.findUnique({ where: { id: targetId } });
    
    if (!requester || !target) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    if (requester.tenantId !== target.tenantId) {
      throw new ForbiddenException('Sem permissão para alterar usuários de outro tenant.');
    }
    if (requester.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores podem alterar permissões.');
    }

    return this.prisma.user.update({
      where: { id: targetId },
      data: { role },
    });
  }
  async updateMe(userId: string, data: { name?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
      },
    });
  }

  async createConsultant(requesterId: string, data: CreateConsultantDto) {
    const requester = await this.prisma.user.findUnique({ where: { id: requesterId } });
    if (!requester || requester.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores podem convidar consultores.');
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new BadRequestException('ERRO CRÍTICO: Configuração do Supabase ausente no servidor.');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 1. Create User in Supabase Auth
    let authData, authError;
    
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Se tiver a chave admin, usa admin.createUser para burlar confirmação de email
      const result = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password || 'Sevilha123!',
        email_confirm: true,
        user_metadata: {
          name: data.name
        }
      });
      authData = result.data.user;
      authError = result.error;
    } else {
      // Se tiver só anon_key, usa signUp normal
      const result = await supabaseAdmin.auth.signUp({
        email: data.email,
        password: data.password || 'Sevilha123!',
        options: {
          data: {
            name: data.name
          }
        }
      });
      authData = result.data.user;
      authError = result.error;
    }

    if (authError) {
      throw new BadRequestException(`Erro no Auth: ${authError.message}`);
    }

    if (!authData || !authData.id) {
      throw new BadRequestException('Erro no Auth: Usuário não retornado pelo Supabase.');
    }

    const authUserId = authData.id;
    try {
      // 2. Create Tenant (Escritório) with schema generation
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 6);
      
      const tenant = await this.tenantsService.create({
        name: `Escritório de ${data.name}`,
        slug,
      });

      // 3. Create User in Prisma
      const user = await this.prisma.user.create({
        data: {
          id: authUserId,
          email: data.email,
          name: data.name,
          role: 'CONSULTANT',
          tenantId: tenant.id
        }
      });

      // 4. Link Consultant to their Tenant
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { consultantId: authUserId }
      });

      return user;
    } catch (err: any) {
      // Rollback: delete the Auth user if anything failed in DB creation
      console.error('Failed to create DB records for new consultant, rolling back Auth.', err);
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      throw new BadRequestException('Falha ao registrar dados no banco. O usuário foi descartado de forma segura.');
    }
  }

  async deleteConsultant(adminId: string, consultantId: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (admin?.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores podem excluir consultores.');
    }

    const consultant = await this.prisma.user.findUnique({ where: { id: consultantId } });
    if (!consultant || consultant.role !== 'CONSULTANT') {
      throw new NotFoundException('Consultor não encontrado.');
    }

    // 1. Find and update the tenant
    const tenant = await this.prisma.tenant.findFirst({
      where: { consultantId: consultant.id }
    });

    if (tenant) {
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { 
          consultantId: null,
          status: 'DISCONTINUED'
        }
      });
    }

    // 2. Delete user from Prisma
    await this.prisma.user.delete({ where: { id: consultantId } });

    // 3. Delete from Supabase Auth
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceRoleKey) {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
        await supabaseAdmin.auth.admin.deleteUser(consultantId);
      }
    } catch (e) {
      console.error('Falha ao deletar usuário no Supabase Auth:', e);
    }

    return { message: 'Consultor removido e escritório descontinuado.' };
  }
}
