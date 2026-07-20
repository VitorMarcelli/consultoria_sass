import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AllocationsService } from './allocations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantAccessGuard } from '../auth/tenant-access.guard';

@Controller('allocations')
@UseGuards(JwtAuthGuard, TenantAccessGuard)
export class AllocationsController {
  constructor(private readonly allocationsService: AllocationsService) {}

  @Post()
  create(@Body() createAllocationDto: any) {
    return this.allocationsService.create(
      createAllocationDto.tenantId,
      createAllocationDto,
    );
  }

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.allocationsService.findAll(tenantId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAllocationDto: any) {
    return this.allocationsService.update(
      updateAllocationDto.tenantId,
      id,
      updateAllocationDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.allocationsService.remove(tenantId, id);
  }
}
