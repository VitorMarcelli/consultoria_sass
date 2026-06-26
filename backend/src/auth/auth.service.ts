import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import UAParser from 'ua-parser-js';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  private getSessionIdFromToken(token: string): string {
    let sessionId = token;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        if (payload.session_id) {
          sessionId = payload.session_id;
        }
      }
    } catch (e) {
      // Ignorar falha de decodificação
    }
    return sessionId;
  }

  async createSession(userId: string, token: string, userAgent: string, ipAddress: string, deviceSessionId?: string) {
    const sessionId = deviceSessionId || this.getSessionIdFromToken(token);

    // Identificar dispositivo e navegador via User-Agent
    const parser = new (UAParser as any)(userAgent);
    const os = parser.getOS();
    const browserResult = parser.getBrowser();
    const deviceResult = parser.getDevice();

    let deviceFamily = `${deviceResult.vendor || ''} ${deviceResult.model || ''}`.trim();
    if (!deviceFamily) {
      deviceFamily = `${os.name || 'Dispositivo'} ${os.version || ''}`.trim();
    }
    const browser = `${browserResult.name || 'Navegador'} ${browserResult.version || ''}`.trim();

    // Rastreamento de Geolocalização por IP com timeout rígido de 1.5s
    let location = 'Localização Indisponível';
    try {
      if (ipAddress && ipAddress !== '127.0.0.1' && ipAddress !== '::1') {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 1500);
        const res = await fetch(`http://ip-api.com/json/${ipAddress}`, { signal: controller.signal });
        clearTimeout(id);
        if (res.ok) {
          const geo = await res.json();
          if (geo.status === 'success') {
            location = `${geo.city}, ${geo.countryCode}`;
          }
        }
      } else {
        location = 'Local (Desenvolvimento)';
      }
    } catch (err) {
      // Silencioso em caso de timeout para não travar o login
    }

    // Regra de concorrência única: desativar as sessões anteriores deste usuário
    await this.prisma.userSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false, status: 'SUPERSEDED' },
    });

    // Upsert da sessão atual
    const existing = await this.prisma.userSession.findFirst({
      where: { refreshToken: sessionId, userId },
    });

    if (existing) {
      return this.prisma.userSession.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          status: 'ACTIVE',
          lastActive: new Date(),
          ipAddress,
          location,
          deviceFamily,
          browser,
        },
      });
    }

    return this.prisma.userSession.create({
      data: {
        userId,
        refreshToken: sessionId,
        deviceFamily,
        browser,
        ipAddress,
        location,
        isActive: true,
        status: 'ACTIVE',
      },
    });
  }

  async getSessions(userId: string, currentToken: string, deviceSessionId?: string) {
    const currentSessionId = deviceSessionId || this.getSessionIdFromToken(currentToken);

    const sessions = await this.prisma.userSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((session) => ({
      ...session,
      isCurrentSession: session.refreshToken === currentSessionId && session.isActive,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, userId },
      data: { isActive: false, status: 'REVOKED' },
    });

    return { success: true, message: 'Sessão desconectada com sucesso' };
  }
}
