import { Body, Controller, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SystemLogService } from './system-log.service';
import { FindSystemLogsDto } from './dto/find-system-logs.dto';

// Toda a Auditoria é admin-only (papel global/cross-tenant) — decorators na
// classe em vez de por método, já que não existe nenhum endpoint aqui que
// deva ficar aberto pra outros papéis.
@Controller('system-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class SystemLogController {
  constructor(private readonly systemLogService: SystemLogService) {}

  @Get()
  findAll(@Query() query: FindSystemLogsDto) {
    return this.systemLogService.findAll(query);
  }

  @Patch(':id/resolve')
  markResolved(
    @Request() req: any,
    @Param('id') id: string,
    @Body('resolved') resolved: boolean,
  ) {
    return this.systemLogService.markResolved(id, req.user.id, resolved);
  }
}
