import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

interface RequestUser {
  id: string;
  role: string | null;
  tenantId: string | null;
}

/**
 * Garante que request.user.role (resolvido pelo JwtAuthGuard, que deve
 * rodar antes na cadeia de guards) está entre as roles exigidas por
 * @Roles(...) no handler. Sem @Roles(), o endpoint fica liberado para
 * qualquer usuário autenticado (mesmo comportamento de não ter o guard).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;

    if (!user?.role || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Você não tem permissão para realizar esta ação.',
      );
    }

    return true;
  }
}
