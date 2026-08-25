import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import { SystemLogService } from './system-log.service';

// Filtro global (@Catch() sem tipo = pega TUDO). Só grava em SystemLog
// quando o status é >= 500 (erro de servidor de verdade) — 400/401/403/404
// são ruído esperado (validação, sessão expirada), não bugs. super.catch()
// preserva exatamente o comportamento de resposta que já existia antes desse
// filtro, então nada muda pro cliente da API.
@Catch()
export class SystemLogExceptionFilter extends BaseExceptionFilter {
  constructor(
    httpAdapterHost: HttpAdapterHost,
    private readonly systemLogService: SystemLogService,
  ) {
    super(httpAdapterHost.httpAdapter);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    if (status >= 500) {
      // Fire-and-forget: nunca await, nunca deixa isso afetar a resposta real.
      this.systemLogService.logError(exception, host).catch(() => {});
    }

    super.catch(exception, host);
  }
}
