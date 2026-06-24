import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('deliveries')
@UseGuards(JwtAuthGuard)
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  async findAll(@Query('tenantId') tenantId: string) {
    try {
      return await this.deliveriesService.findAll(tenantId);
    } catch (error) {
      require('fs').writeFileSync('deliveries_error.log', String(error?.stack || error));
      throw error;
    }
  }

  @Post('generate-monthly')
  generateMonthlyDeliveries(@Body('tenantId') tenantId: string) {
    return this.deliveriesService.generateMonthlyDeliveries(tenantId);
  }

  @Post()
  create(@Body() createDto: any) {
    return this.deliveriesService.create(createDto.tenantId, createDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.deliveriesService.update(updateDto.tenantId, id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.deliveriesService.remove(tenantId, id);
  }
}
