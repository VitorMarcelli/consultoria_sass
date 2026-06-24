import { Controller, Get, Post, Param, Body, UseGuards, Query, Request } from '@nestjs/common';
import { TimesheetsService } from './timesheets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('timesheets')
@UseGuards(JwtAuthGuard)
export class TimesheetsController {
  constructor(private readonly timesheetsService: TimesheetsService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string, @Query('clientId') clientId?: string) {
    return this.timesheetsService.findAll(tenantId, clientId);
  }

  @Post('start')
  startTimer(@Body() body: any) {
    return this.timesheetsService.startTimer(body.tenantId, body);
  }

  @Post('stop/:id')
  stopTimer(@Param('id') id: string, @Body('tenantId') tenantId: string) {
    return this.timesheetsService.stopTimer(tenantId, id);
  }

  @Post('manual')
  createManual(@Body() body: any) {
    return this.timesheetsService.createManual(body.tenantId, body);
  }

  @Get('dre/:clientId')
  calculateContractDre(
    @Param('clientId') clientId: string,
    @Query('tenantId') tenantId: string,
    @Request() req: any,
  ) {
    const userRole = req.user?.role || 'CONSULTANT';
    return this.timesheetsService.calculateContractDre(tenantId, clientId, userRole);
  }
}
