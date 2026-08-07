import { ForbiddenException, Injectable } from '@nestjs/common';
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
        const payload = JSON.parse(
          Buffer.from(parts[1], 'base64').toString('utf-8'),
        );
        if (payload.session_id) {
          sessionId = payload.session_id;
        }
      }
    } catch (e) {
      // Ignorar falha de decodificação
    }
    return sessionId;
  }

  async createSession(
    userId: string,
    token: string,
    userAgent: string,
    ipAddress: string,
    deviceSessionId?: string,
  ) {
    const sessionId = deviceSessionId || this.getSessionIdFromToken(token);

    // Identificar dispositivo e navegador via User-Agent
    const parser = new (UAParser as any)(userAgent);
    const os = parser.getOS();
    const browserResult = parser.getBrowser();
    const deviceResult = parser.getDevice();

    let deviceFamily =
      `${deviceResult.vendor || ''} ${deviceResult.model || ''}`.trim();
    if (!deviceFamily) {
      deviceFamily = `${os.name || 'Dispositivo'} ${os.version || ''}`.trim();
    }
    const browser =
      `${browserResult.name || 'Navegador'} ${browserResult.version || ''}`.trim();

    // Rastreamento de Geolocalização por IP com timeout rígido de 1.5s
    let location = 'Localização Indisponível';
    try {
      if (ipAddress && ipAddress !== '127.0.0.1' && ipAddress !== '::1') {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 1500);
        const res = await fetch(`http://ip-api.com/json/${ipAddress}`, {
          signal: controller.signal,
        });
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

    // Limite de sessões simultâneas: em vez de sempre derrubar as sessões
    // anteriores (regra antiga, fixa em 1 pra todo mundo), agora só bloqueia
    // o login NOVO quando a conta já está no teto configurado — as sessões
    // existentes não são tocadas.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { maxConcurrentSessions: true },
    });
    const limit = user?.maxConcurrentSessions ?? 1;

    const existing = await this.prisma.userSession.findFirst({
      where: { refreshToken: sessionId, userId },
    });
    // Um dispositivo que já está ATIVO (ex: refresh de token no mesmo
    // navegador) nunca conta como slot novo. Um dispositivo que existe mas
    // está INATIVO (foi revogado/superado antes) reativar ELE consome um
    // slot novo de verdade — por isso a checagem é isActive, não só "existe".
    const isSameActiveDevice = existing?.isActive === true;

    const otherActiveCount = await this.prisma.userSession.count({
      where: {
        userId,
        isActive: true,
        ...(existing ? { NOT: { id: existing.id } } : {}),
      },
    });

    if (!isSameActiveDevice && otherActiveCount >= limit) {
      throw new ForbiddenException('SESSION_LIMIT_REACHED');
    }

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

  async getSessions(
    userId: string,
    currentToken: string,
    deviceSessionId?: string,
  ) {
    const currentSessionId =
      deviceSessionId || this.getSessionIdFromToken(currentToken);

    const sessions = await this.prisma.userSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((session) => ({
      ...session,
      isCurrentSession:
        session.refreshToken === currentSessionId && session.isActive,
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
