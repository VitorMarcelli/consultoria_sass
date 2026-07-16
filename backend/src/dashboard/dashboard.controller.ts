import {
  Controller,
  Get,
  Param,
  UseGuards,
  Patch,
  Body,
  Query,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('cycle-mapping/:cycleId/:frontId')
  async getCycleMapping(
    @Param('cycleId') cycleId: string,
    @Param('frontId') frontId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.dashboardService.getCycleMapping(tenantId, cycleId, frontId);
  }

  @Get('capacity/:cycleId/:frontId')
  async getCapacityPlanning(
    @Param('cycleId') cycleId: string,
    @Param('frontId') frontId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.dashboardService.getCapacityPlanning(
      tenantId,
      cycleId,
      frontId,
    );
  }

  @Get('leveling/:cycleId/:frontId')
  async getDailyLeveling(
    @Param('cycleId') cycleId: string,
    @Param('frontId') frontId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.dashboardService.getDailyLeveling(tenantId, cycleId, frontId);
  }

  @Patch('leveling/reschedule')
  async rescheduleDeliveries(
    @Body()
    payload: {
      deliveryIds: string[];
      newExecutionDate: string;
      tenantId: string;
    },
  ) {
    return this.dashboardService.rescheduleBulkDeliveries(
      payload.tenantId,
      payload.deliveryIds,
      payload.newExecutionDate,
    );
  }
}
