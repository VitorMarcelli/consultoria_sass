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

  @Patch(':id/estimated-time')
  updateEstimatedTime(@Param('id') id: string, @Body() body: any) {
    return this.deliveriesService.updateEstimatedTime(body.tenantId, id, body.estimatedTimeMinutes, body.authorName);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.deliveriesService.remove(tenantId, id);
  }

  // =====================================
  // ROTAS DO SLIDE-OVER (Ações Rápidas)
  // =====================================

  @Get(':id/details')
  getSlideOverData(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.deliveriesService.getSlideOverData(tenantId, id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: any) {
    return this.deliveriesService.updateStatus(body.tenantId, id, body.status, body.authorName);
  }

  @Post(':id/checklist')
  addChecklist(@Param('id') id: string, @Body() body: any) {
    return this.deliveriesService.addChecklistItem(body.tenantId, id, body.description);
  }

  @Patch(':id/checklist/:itemId')
  toggleChecklist(@Param('id') id: string, @Param('itemId') itemId: string, @Body() body: any) {
    return this.deliveriesService.toggleChecklistItem(body.tenantId, id, itemId, body.isCompleted);
  }

  @Delete(':id/checklist/:itemId')
  removeChecklist(@Param('id') id: string, @Param('itemId') itemId: string, @Query('tenantId') tenantId: string) {
    return this.deliveriesService.removeChecklistItem(tenantId, id, itemId);
  }

  @Post(':id/proofs')
  addProof(@Param('id') id: string, @Body() body: any) {
    return this.deliveriesService.addProof(body.tenantId, id, body.title, body.url, body.authorName);
  }

  @Delete(':id/proofs/:proofId')
  removeProof(@Param('id') id: string, @Param('proofId') proofId: string, @Query('tenantId') tenantId: string) {
    return this.deliveriesService.removeProof(tenantId, id, proofId);
  }

  @Post(':id/history')
  addHistory(@Param('id') id: string, @Body() body: any) {
    return this.deliveriesService.addHistoryComment(body.tenantId, id, body.description, body.authorName);
  }

  // =====================================
  // TIME TRACKER
  // =====================================

  @Post(':id/timer/start')
  startTimer(@Param('id') id: string, @Body('tenantId') tenantId: string) {
    return this.deliveriesService.startTimer(tenantId, id);
  }

  @Post(':id/timer/stop')
  stopTimer(@Param('id') id: string, @Body('tenantId') tenantId: string) {
    return this.deliveriesService.stopTimer(tenantId, id);
  }
}
