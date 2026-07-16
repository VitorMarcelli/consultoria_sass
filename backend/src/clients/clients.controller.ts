import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(@Body() createClientDto: any) {
    return this.clientsService.create(
      createClientDto.tenantId,
      createClientDto,
      createClientDto.cycleId,
      createClientDto.frontId,
      createClientDto.subdivisionId,
    );
  }

  @Post('bulk')
  bulkImport(@Body() bulkDto: any) {
    return this.clientsService.bulkImport(bulkDto.tenantId, bulkDto.clients);
  }

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.clientsService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.clientsService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClientDto: any) {
    return this.clientsService.update(
      updateClientDto.tenantId,
      id,
      updateClientDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.clientsService.remove(tenantId, id);
  }
}
