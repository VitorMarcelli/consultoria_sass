import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Headers,
  Ip,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @Post('sessions')
  async createSession(
    @Request() req: any,
    @Body()
    body: { userAgent?: string; ipAddress?: string; deviceSessionId?: string },
    @Headers('user-agent') defaultUserAgent: string,
    @Ip() defaultIp: string,
  ) {
    const token = req.headers?.authorization?.replace('Bearer ', '');
    const userAgent = body.userAgent || defaultUserAgent || '';
    const ipAddress = body.ipAddress || defaultIp || '127.0.0.1';

    return this.authService.createSession(
      req.user.id,
      token,
      userAgent,
      ipAddress,
      body.deviceSessionId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions/check')
  async checkSession() {
    return { active: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async getSessions(@Request() req: any) {
    const token = req.headers?.authorization?.replace('Bearer ', '');
    const deviceSessionId = req.headers['x-device-session-id'];
    return this.authService.getSessions(req.user.id, token, deviceSessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  async revokeSession(@Request() req: any, @Param('id') sessionId: string) {
    return this.authService.revokeSession(req.user.id, sessionId);
  }
}
