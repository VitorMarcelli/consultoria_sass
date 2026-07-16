import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('SUPABASE_JWT_SECRET') ||
        'super-secret-jwt-token-with-at-least-32-characters-long',
      algorithms: ['HS256'],
    });
  }

  async validate(payload: any) {
    // The payload from Supabase JWT contains user id in payload.sub
    // We attach this to request.user
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
