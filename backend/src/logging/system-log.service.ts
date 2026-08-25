import { ArgumentsHost, HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FindSystemLogsDto } from './dto/find-system-logs.dto';

// Poucas entradas, deliberadamente não-exaustivo — as mutações de maior
// sinal, o resto cai no fallback "método + caminho" cru na tela.
const ACTION_LABELS: Record<string, string> = {
  'POST /clients': 'Criou cliente',
  'PATCH /clients/:id': 'Editou cliente',
  'DELETE /clients/:id': 'Excluiu cliente',
  'POST /imports/clients-json': 'Importou planilha de clientes',
  'POST /users/consultant': 'Criou consultor',
  'DELETE /users/consultant/:id': 'Removeu consultor',
  'PATCH /users/:id/role': 'Alterou papel de usuário',
  'PATCH /users/:id/access-limit': 'Alterou limite de acessos',
  'POST /deliveries': 'Criou entrega',
  'PATCH /deliveries/:id': 'Atualizou entrega',
  'POST /management-cycles/:id/clients': 'Alocou cliente ao ciclo',
  'POST /opportunities': 'Criou oportunidade',
  'POST /auth/sessions': 'Fez login',
};

@Injectable()
export class SystemLogService {
  constructor(private readonly prisma: PrismaService) {}

  private extractActor(request: any) {
    const user = request?.user;
    const tenantId =
      user?.tenantId ?? request?.query?.tenantId ?? request?.body?.tenantId ?? null;
    return {
      userId: user?.id ?? null,
      userName: user?.name ?? null,
      userEmail: user?.email ?? null,
      tenantId: tenantId || null,
    };
  }

  private async resolveTenantName(tenantId: string | null): Promise<string | null> {
    if (!tenantId) return null;
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      });
      return tenant?.name ?? null;
    } catch {
      return null;
    }
  }

  private resolveAction(method: string, routePath: string | undefined): string | null {
    if (!routePath) return null;
    return ACTION_LABELS[`${method} ${routePath}`] ?? null;
  }

  async logError(exception: unknown, host: ArgumentsHost): Promise<void> {
    try {
      const request: any = host.switchToHttp().getRequest();
      const actor = this.extractActor(request);
      const statusCode =
        exception instanceof HttpException ? exception.getStatus() : 500;
      const message =
        exception instanceof Error ? exception.message : String(exception);
      const stack = exception instanceof Error ? exception.stack : undefined;

      await this.prisma.systemLog.create({
        data: {
          level: 'ERROR',
          ...actor,
          tenantName: await this.resolveTenantName(actor.tenantId),
          method: request?.method ?? 'UNKNOWN',
          path: request?.route?.path || request?.originalUrl || request?.url || 'unknown',
          statusCode,
          errorMessage: message?.slice(0, 2000),
          stackTrace: stack?.slice(0, 8000),
        },
      });
    } catch (err) {
      // Nunca deixa uma falha ao logar quebrar a resposta real.
      console.error('SystemLogService.logError falhou:', err);
    }
  }

  async logActivity(request: any): Promise<void> {
    try {
      const actor = this.extractActor(request);
      const method = request?.method ?? 'UNKNOWN';
      const routePath = request?.route?.path;

      await this.prisma.systemLog.create({
        data: {
          level: 'INFO',
          ...actor,
          tenantName: await this.resolveTenantName(actor.tenantId),
          method,
          path: routePath || request?.originalUrl || request?.url || 'unknown',
          action: this.resolveAction(method, routePath),
        },
      });
    } catch (err) {
      console.error('SystemLogService.logActivity falhou:', err);
    }
  }

  async findAll(filters: FindSystemLogsDto) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 25;

    const where: any = {};
    if (filters.level) where.level = filters.level;
    if (filters.resolved !== undefined) where.resolved = filters.resolved;
    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (filters.userId) where.userId = filters.userId;

    const [items, total] = await Promise.all([
      this.prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.systemLog.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async markResolved(id: string, resolvedBy: string, resolved: boolean) {
    return this.prisma.systemLog.update({
      where: { id },
      data: {
        resolved,
        resolvedAt: resolved ? new Date() : null,
        resolvedBy: resolved ? resolvedBy : null,
      },
    });
  }
}
