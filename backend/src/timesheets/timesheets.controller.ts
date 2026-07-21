import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { TimesheetsService } from './timesheets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantAccessGuard } from '../auth/tenant-access.guard';

@Controller('timesheets')
@UseGuards(JwtAuthGuard, TenantAccessGuard)
export class TimesheetsController {
  constructor(private readonly timesheetsService: TimesheetsService) {}

  @Get()
  findAll(
    @Query('tenantId') tenantId: string,
    @Query('clientId') clientId: string | undefined,
    @Request() req: { user?: { role?: string } },
  ) {
    return this.timesheetsService.findAll(
      tenantId,
      clientId,
      req.user?.role || 'CONSULTANT',
    );
  }

  @Post('start')
  startTimer(
    @Body()
    body: {
      tenantId: string;
      clientId: string;
      employeeId: string;
      deliveryId?: string;
      activityDescription?: string;
    },
  ) {
    return this.timesheetsService.startTimer(body.tenantId, body);
  }

  @Post('stop/:id')
  stopTimer(@Param('id') id: string, @Body('tenantId') tenantId: string) {
    return this.timesheetsService.stopTimer(tenantId, id);
  }

  @Post('manual')
  createManual(
    @Body()
    body: {
      tenantId: string;
      clientId: string;
      employeeId: string;
      deliveryId?: string;
      activityDescription?: string;
      durationMinutes: number;
      type?: 'RECURRENT' | 'EXTRA' | 'REWORK';
      logDate?: string;
    },
  ) {
    return this.timesheetsService.createManual(body.tenantId, body);
  }

  @Get('dre/:clientId')
  calculateContractDre(
    @Param('clientId') clientId: string,
    @Query('tenantId') tenantId: string,
    @Request() req: { user?: { role?: string } },
  ) {
    const userRole = req.user?.role || 'CONSULTANT';
    return this.timesheetsService.calculateContractDre(
      tenantId,
      clientId,
      userRole,
    );
  }
}
