import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface RequestUser {
  id: string;
  role: string | null;
  tenantId: string | null;
}

/**
 * Garante que todo tenantId presente na query e no body de uma requisição
 * pertence ao usuário autenticado (seu tenant "casa") ou está sob a carteira
 * do consultor (Tenant.consultantId). Sem essa checagem, qualquer usuário
 * autenticado podia trocar o tenantId na requisição e ler/escrever dados de
 * outro escritório — deve rodar sempre depois do JwtAuthGuard.
 */
@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;

    if (!user?.id) {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    const candidates = [request.query?.tenantId, request.body?.tenantId].filter(
      (v): v is string => typeof v === 'string' && v.length > 0,
    );

    if (candidates.length === 0) {
      // Nenhum tenantId foi solicitado nesta chamada; nada a validar aqui.
      return true;
    }

    // ADMIN (equipe interna Sevilha) enxerga todos os escritórios.
    if (user.role === 'ADMIN') {
      return true;
    }

    let managedTenantIds: Set<string> | null = null;

    for (const tenantId of new Set(candidates)) {
      if (user.tenantId && user.tenantId === tenantId) {
        continue;
      }

      if (user.role === 'CONSULTANT') {
        if (!managedTenantIds) {
          const managed = await this.prisma.tenant.findMany({
            where: { consultantId: user.id },
            select: { id: true },
          });
          managedTenantIds = new Set(managed.map((t) => t.id));
        }
        if (managedTenantIds.has(tenantId)) {
          continue;
        }
      }

      throw new ForbiddenException(
        'Você não tem acesso aos dados deste escritório.',
      );
    }

    return true;
  }
}
