import { Controller, Get, Post, Delete, Put, Body, UseGuards, Query, Param } from '@nestjs/common';
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

  @Get(':id')
  findOne(@Param('id') cycleId: string, @Query('tenantId') tenantId: string) {
    return this.cyclesService.findOne(tenantId, cycleId);
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
    @Query('subdivisionId') subdivisionId?: string,
    @Query('clientId') clientId?: string
  ) {
    return this.cyclesService.getCycleClients(tenantId, cycleId, frontId, subdivisionId, clientId);
  }

  @Get(':id/team')
  getCycleTeam(
    @Param('id') cycleId: string, 
    @Query('tenantId') tenantId: string,
    @Query('frontId') frontId?: string,
    @Query('subdivisionId') subdivisionId?: string,
    @Query('employeeId') employeeId?: string
  ) {
    return this.cyclesService.getCycleTeam(tenantId, cycleId, frontId, subdivisionId, employeeId);
  }

  @Post()
  createCycle(@Body() body: { tenantId: string, month: number, year: number }) {
    return this.cyclesService.createCycle(body.tenantId, body);
  }

  @Put(':id')
  updateCycle(
    @Param('id') cycleId: string,
    @Body() body: { tenantId: string, goal?: string, status?: string }
  ) {
    return this.cyclesService.updateCycle(body.tenantId, cycleId, { goal: body.goal, status: body.status });
  }

  @Post(':id/clients')
  allocateClient(
    @Param('id') cycleId: string,
    @Body() body: { tenantId: string, clientId: string, frontId: string, subdivisionId?: string }
  ) {
    return this.cyclesService.allocateClientToCycle(body.tenantId, cycleId, body);
  }

  @Put(':id/clients/:snapshotId')
  updateClientSnapshot(
    @Param('id') cycleId: string,
    @Param('snapshotId') snapshotId: string,
    @Body() body: any
  ) {
    return this.cyclesService.updateClientCycleSnapshot(body.tenantId, cycleId, snapshotId, body);
  }

  @Delete(':id/clients/:snapshotId')
  removeClientFromCycleFront(
    @Param('id') cycleId: string,
    @Param('snapshotId') snapshotId: string,
    @Query('tenantId') tenantId: string
  ) {
    return this.cyclesService.removeClientFromCycleFront(tenantId, cycleId, snapshotId);
  }

  @Delete(':id/team/:allocationId')
  removeTeamFromCycleFront(
    @Param('id') cycleId: string,
    @Param('allocationId') allocationId: string,
    @Query('tenantId') tenantId: string
  ) {
    return this.cyclesService.removeTeamFromCycleFront(tenantId, cycleId, allocationId);
  }

  @Delete(':id')
  deleteCycle(@Param('id') cycleId: string, @Query('tenantId') tenantId: string) {
    return this.cyclesService.deleteCycle(tenantId, cycleId);
  }
}
