import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}
