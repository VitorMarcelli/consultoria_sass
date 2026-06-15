import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { SystemOptionsService } from './system-options.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('system-options')
export class SystemOptionsController {
  constructor(private readonly systemOptionsService: SystemOptionsService) {}

  @Post()
  create(@Body() createSystemOptionDto: any) {
    return this.systemOptionsService.create(createSystemOptionDto);
  }

  @Get()
  findAll() {
    return this.systemOptionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.systemOptionsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSystemOptionDto: any) {
    return this.systemOptionsService.update(id, updateSystemOptionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.systemOptionsService.remove(id);
  }
}
