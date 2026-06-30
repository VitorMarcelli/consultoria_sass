import { Controller, Get, Param, UseGuards, Patch, Body } from '@nestjs/common';
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
  ) {
    return this.dashboardService.getCycleMapping(cycleId, frontId);
  }

  @Get('capacity/:cycleId/:frontId')
  async getCapacityPlanning(
    @Param('cycleId') cycleId: string,
    @Param('frontId') frontId: string,
  ) {
    return this.dashboardService.getCapacityPlanning(cycleId, frontId);
  }

  @Get('leveling/:cycleId/:frontId')
  async getDailyLeveling(
    @Param('cycleId') cycleId: string,
    @Param('frontId') frontId: string,
  ) {
    return this.dashboardService.getDailyLeveling(cycleId, frontId);
  }

  @Patch('leveling/reschedule')
  async rescheduleDeliveries(
    @Body() payload: { deliveryIds: string[], newExecutionDate: string }
  ) {
    return this.dashboardService.rescheduleBulkDeliveries(payload.deliveryIds, payload.newExecutionDate);
  }
}
