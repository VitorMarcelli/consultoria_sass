import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

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
      
      return true;
    } catch (err: any) {
      console.error('JwtAuthGuard Verificaçao Falhou:', err.message);
      throw new UnauthorizedException(`Erro JWT: ${err.message}`);
    }
  }
}
