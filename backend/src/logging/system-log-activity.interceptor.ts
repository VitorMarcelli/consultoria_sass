import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SystemLogService } from './system-log.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Interceptor global — só registra atividade em requisições que alteram
// dado (GET é só navegação, não é "atividade"). Roda depois da resposta ter
// sido produzida com sucesso (tap), fire-and-forget: nunca await, nunca
// atrasa/quebra a resposta real.
@Injectable()
export class SystemLogActivityInterceptor implements NestInterceptor {
  constructor(private readonly systemLogService: SystemLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (!MUTATING_METHODS.has(request.method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        this.systemLogService.logActivity(request).catch(() => {});
      }),
    );
  }
}
