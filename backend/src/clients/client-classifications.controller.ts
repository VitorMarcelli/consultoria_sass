import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { ClientClassificationsService } from './client-classifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('client-classifications')
@UseGuards(JwtAuthGuard)
export class ClientClassificationsController {
  constructor(
    private readonly classificationsService: ClientClassificationsService,
  ) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.classificationsService.findAll(tenantId);
  }

  @Post('upsert')
  upsert(@Body() dto: any) {
    return this.classificationsService.upsert(dto.tenantId, dto);
  }
}
