import { Module } from '@nestjs/common';
import { SystemLogController } from './system-log.controller';
import { SystemLogService } from './system-log.service';

// O filtro/interceptor globais (APP_FILTER/APP_INTERCEPTOR) são registrados
// no AppModule, não aqui — é onde o Nest exige que fiquem pra funcionar com
// DI de verdade em todo o app.
@Module({
  controllers: [SystemLogController],
  providers: [SystemLogService],
  exports: [SystemLogService],
})
export class LoggingModule {}
