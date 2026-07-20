import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientClassificationsService } from './client-classifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantAccessGuard } from '../auth/tenant-access.guard';

@Controller('clients/:clientId/fronts/:frontId/classification')
@UseGuards(JwtAuthGuard, TenantAccessGuard)
export class ClientClassificationsController {
  constructor(
    private readonly classificationsService: ClientClassificationsService,
  ) {}

  @Get()
  async getClassification(
    @Query('tenantId') tenantId: string,
    @Param('clientId') clientId: string,
    @Param('frontId') frontId: string,
  ) {
    return this.classificationsService.getClassification(
      tenantId,
      clientId,
      frontId,
    );
  }

  @Put()
  async updateClassification(
    @Body('tenantId') tenantId: string,
    @Param('clientId') clientId: string,
    @Param('frontId') frontId: string,
    @Body() body: any,
  ) {
    return this.classificationsService.updateClassification(
      tenantId,
      clientId,
      frontId,
      body,
    );
  }
}
