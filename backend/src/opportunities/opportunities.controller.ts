import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('opportunities')
@UseGuards(JwtAuthGuard)
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string, @Query('clientId') clientId?: string) {
    return this.opportunitiesService.findAll(tenantId, clientId);
  }

  @Get('dashboard')
  getDashboard(@Query('tenantId') tenantId: string) {
    return this.opportunitiesService.getDashboardData(tenantId);
  }

  @Post('scan')
  scanOpportunities(@Body('tenantId') tenantId: string) {
    return this.opportunitiesService.scanAndGenerateOpportunities(tenantId);
  }

  @Post()
  create(@Body() createDto: any) {
    return this.opportunitiesService.create(createDto.tenantId, createDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.opportunitiesService.update(updateDto.tenantId, id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.opportunitiesService.remove(tenantId, id);
  }
}
