import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantAccessGuard } from '../auth/tenant-access.guard';

@Controller('employees')
@UseGuards(JwtAuthGuard, TenantAccessGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.employeesService.findAll(tenantId);
  }

  @Post()
  create(@Body() createDto: any) {
    return this.employeesService.create(createDto.tenantId, createDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.employeesService.update(updateDto.tenantId, id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.employeesService.remove(tenantId, id);
  }
}
