import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createClient } from '@supabase/supabase-js';
import { CreateConsultantDto } from './dto/create-consultant.dto';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
    let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey && process.env.SUPABASE_JWT_SECRET && supabaseUrl) {
      const ref = supabaseUrl.split('//')[1]?.split('.')[0];
      serviceRoleKey = jwt.sign(
        { role: 'service_role', iss: 'supabase', ref },
        process.env.SUPABASE_JWT_SECRET,
        { expiresIn: '1h' }
      );
    }

    if (!supabaseUrl || !serviceRoleKey) {
      throw new BadRequestException('ERRO CRÍTICO: Configuração do Supabase ausente (URL ou JWT_SECRET não configurados).');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 1. Create User in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password || 'Sevilha123!',
      email_confirm: true,
      user_metadata: {
        name: data.name
      }
    });

    if (authError) {
      throw new BadRequestException(`Erro no Auth: ${authError.message}`);
    }

    const authUserId = authData.user.id;

    try {
      // 2. Create Tenant (Escritório)
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 6);
      
      const tenant = await this.prisma.tenant.create({
        data: {
          name: `Escritório de ${data.name}`,
          slug,
          status: 'ACTIVE'
        }
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

      return user;
    } catch (err: any) {
      // Rollback: delete the Auth user if anything failed in DB creation
      console.error('Failed to create DB records for new consultant, rolling back Auth.', err);
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      throw new BadRequestException('Falha ao registrar dados no banco. O usuário foi descartado de forma segura.');
    }
  }
}
