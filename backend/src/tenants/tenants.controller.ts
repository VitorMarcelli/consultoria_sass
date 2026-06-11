import { Controller, Get, Post, Body, Param, UseGuards, Patch, Delete, Request, ForbiddenException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  create(@Body() createTenantDto: { name: string; cnpj?: string; slug: string; consultantId?: string }) {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTenantDto: { 
      name?: string; 
      cnpj?: string; 
      consultantId?: string; 
      status?: string;
      city?: string;
      state?: string;
      size?: string;
      accountingSystem?: string;
      observations?: string;
    }
  ) {
    return this.tenantsService.update(id, updateTenantDto);
  }

  @Get(':id/templates')
  getTemplates(@Param('id') id: string) {
    return this.tenantsService.getTemplates(id);
  }

  @Post(':id/templates')
  updateTemplateStatus(
    @Param('id') id: string,
    @Body() data: { layer: number; templateName: string; status: string; fileUrl?: string }
  ) {
    return this.tenantsService.updateTemplateStatus(id, data);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    // Check if the user is trying to delete their own base tenant
    if (req.user?.tenantId === id) {
      throw new ForbiddenException('Você não pode excluir o seu próprio escritório base (Workspace principal).');
    }

    return this.tenantsService.remove(id);
  }
}
