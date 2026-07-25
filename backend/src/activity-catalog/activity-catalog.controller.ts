import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ActivityCatalogService } from './activity-catalog.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantAccessGuard } from '../auth/tenant-access.guard';

@Controller('activity-catalog')
@UseGuards(JwtAuthGuard, TenantAccessGuard)
export class ActivityCatalogController {
  constructor(
    private readonly activityCatalogService: ActivityCatalogService,
  ) {}

  @Get()
  findAll(
    @Query('tenantId') tenantId: string,
    @Query('frontId') frontId?: string,
  ) {
    return this.activityCatalogService.findAll(tenantId, frontId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.activityCatalogService.findOne(tenantId, id);
  }

  @Post()
  create(@Body() body: Record<string, any>) {
    return this.activityCatalogService.create(body.tenantId, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.activityCatalogService.update(body.tenantId, id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.activityCatalogService.remove(tenantId, id);
  }
}
