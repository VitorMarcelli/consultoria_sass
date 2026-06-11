import { Controller, Get, Post, Delete, Body, UseGuards, Query, Param } from '@nestjs/common';
import { ManagementCyclesService } from './management-cycles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('management-cycles')
@UseGuards(JwtAuthGuard)
export class ManagementCyclesController {
  constructor(private readonly cyclesService: ManagementCyclesService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.cyclesService.findAll(tenantId);
  }

  @Get(':id/dashboard')
  getDashboard(
    @Param('id') cycleId: string, 
    @Query('tenantId') tenantId: string,
    @Query('frontId') frontId?: string,
    @Query('subdivisionId') subdivisionId?: string
  ) {
    return this.cyclesService.getDashboardStats(tenantId, cycleId, frontId, subdivisionId);
  }

  @Get(':id/clients')
  getCycleClients(
    @Param('id') cycleId: string, 
    @Query('tenantId') tenantId: string,
    @Query('frontId') frontId?: string,
    @Query('subdivisionId') subdivisionId?: string
  ) {
    return this.cyclesService.getCycleClients(tenantId, cycleId, frontId, subdivisionId);
  }

  @Get(':id/team')
  getCycleTeam(
    @Param('id') cycleId: string, 
    @Query('tenantId') tenantId: string,
    @Query('frontId') frontId?: string,
    @Query('subdivisionId') subdivisionId?: string
  ) {
    return this.cyclesService.getCycleTeam(tenantId, cycleId, frontId, subdivisionId);
  }

  @Post()
  createCycle(@Body() body: { tenantId: string, month: number, year: number }) {
    return this.cyclesService.createCycle(body.tenantId, body);
  }

  @Delete(':id')
  deleteCycle(@Param('id') cycleId: string, @Query('tenantId') tenantId: string) {
    return this.cyclesService.deleteCycle(tenantId, cycleId);
  }
}
