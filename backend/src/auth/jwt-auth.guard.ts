import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      console.error('JwtAuthGuard: Token ausente no cabeçalho');
      throw new UnauthorizedException('Token ausente');
    }

    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('JwtAuthGuard: SUPABASE_URL ou SUPABASE_ANON_KEY ausentes no .env');
      throw new UnauthorizedException('Erro de configuração do servidor');
    }

    try {
      // Usamos a própria API do Supabase para verificar o token.
      // Isso resolve completamente problemas de algoritmo (ES256 vs HS256), JWKS e chaves assimétricas.
      const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.msg || 'Assinatura inválida ou token expirado');
      }

      const userData = await response.json();
      
      // Mapeamos os dados retornados para o request.user esperado pelo NestJS
      request.user = { 
        id: userData.id, 
        email: userData.email, 
        role: userData.role || 'authenticated' 
      };

      // Invalidação em tempo real: checar se a sessão do token está ativa (se houver registro no UserSession)
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          const sessionId = payload.session_id;
          if (sessionId) {
            const session = await this.prisma.userSession.findFirst({
              where: { refreshToken: sessionId, userId: userData.id },
            });
            if (session && !session.isActive) {
              throw new UnauthorizedException('Sessão desconectada ou substituída por outro dispositivo');
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
      throw new UnauthorizedException(err instanceof UnauthorizedException ? err.message : `Erro JWT: ${err.message}`);
    }
  }
}
