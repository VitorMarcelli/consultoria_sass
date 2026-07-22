import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  // O guard é singleton (Nest não recria providers por request por padrão),
  // então o JWKS remoto é buscado uma vez e cacheado em memória pelo próprio
  // `jose` (com cooldown/revalidação automática) — reaproveitado por todas
  // as requisições do processo, em vez de bater na rede a cada chamada.
  private jwks: JWTVerifyGetKey | null = null;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  private getJwks(supabaseUrl: string): JWTVerifyGetKey {
    if (!this.jwks) {
      this.jwks = createRemoteJWKSet(
        new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
      );
    }
    return this.jwks;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      console.error('JwtAuthGuard: Token ausente no cabeçalho');
      throw new UnauthorizedException('Token ausente');
    }

    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');

    if (!supabaseUrl) {
      console.error('JwtAuthGuard: SUPABASE_URL ausente no .env');
      throw new UnauthorizedException('Erro de configuração do servidor');
    }

    try {
      // Verificação local via JWKS (chave pública ES256 do projeto Supabase),
      // sem round-trip de rede a cada requisição — antes isso era feito via
      // fetch(`${supabaseUrl}/auth/v1/user`) em TODA chamada autenticada, o
      // que somado às várias chamadas por tela pesava bastante no tempo de
      // carregamento.
      const { payload } = await jwtVerify(token, this.getJwks(supabaseUrl), {
        issuer: `${supabaseUrl}/auth/v1`,
        audience: 'authenticated',
      });

      const userId = payload.sub as string;
      const email = payload.email as string | undefined;

      // Resolvemos o papel e o tenant REAIS a partir da nossa base (tabela User),
      // e não da claim do Supabase (que é sempre "authenticated"). Isso é o que
      // permite ao TenantAccessGuard e às regras de RBAC confiarem em req.user.
      const dbUser = await this.prisma.user
        .findUnique({
          where: { id: userId },
          select: { role: true, tenantId: true },
        })
        .catch(() => null);

      // Mapeamos os dados do token para o request.user esperado pelo NestJS
      request.user = {
        id: userId,
        email,
        // null quando o usuário Supabase ainda não tem linha em User
        // (fluxo de auto-provisionamento em GET /users/me).
        role: dbUser?.role ?? null,
        tenantId: dbUser?.tenantId ?? null,
      };

      // Invalidação em tempo real: checar se a sessão do token está ativa (se houver registro no UserSession)
      try {
        const isCreatingSession =
          request.method === 'POST' && request.url.includes('/auth/sessions');
        if (!isCreatingSession) {
          const deviceSessionId = request.headers['x-device-session-id'];
          const sessionId =
            deviceSessionId || (payload as Record<string, unknown>).session_id;
          if (sessionId) {
            const session = await this.prisma.userSession.findFirst({
              where: { refreshToken: sessionId as string, userId },
            });
            if (session && !session.isActive) {
              throw new UnauthorizedException(
                'Sessão desconectada ou substituída por outro dispositivo',
              );
            }
          }
        }
      } catch (sessionErr: any) {
        if (sessionErr instanceof UnauthorizedException) {
          throw sessionErr;
        }
        // Em caso de erro leve de decodificação, prosseguimos
      }

      return true;
    } catch (err: any) {
      console.error('JwtAuthGuard Verificaçao Falhou:', err.message);
      throw new UnauthorizedException(
        err instanceof UnauthorizedException
          ? err.message
          : `Erro JWT: ${err.message}`,
      );
    }
  }
}
