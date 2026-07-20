import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Patch,
  Delete,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  private assertAdmin(req: any) {
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Apenas administradores podem executar esta ação.',
      );
    }
  }

  private async assertCanAccess(req: any, tenantId: string) {
    const allowed = await this.tenantsService.userCanAccess(
      tenantId,
      req.user,
    );
    if (!allowed) {
      throw new ForbiddenException(
        'Você não tem acesso a este escritório.',
      );
    }
  }

  @Post()
  create(
    @Request() req: any,
    @Body()
    createTenantDto: {
      name: string;
      cnpj?: string;
      slug: string;
      consultantId?: string;
    },
  ) {
    this.assertAdmin(req);
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.tenantsService.findAll(req.user);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    await this.assertCanAccess(req, id);
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    updateTenantDto: {
      name?: string;
      cnpj?: string;
      consultantId?: string;
      status?: string;
      city?: string;
      state?: string;
      size?: string;
      accountingSystem?: string;
      observations?: string;
    },
  ) {
    await this.assertCanAccess(req, id);
    return this.tenantsService.update(id, updateTenantDto);
  }

  @Get(':id/templates')
  async getTemplates(@Request() req: any, @Param('id') id: string) {
    await this.assertCanAccess(req, id);
    return this.tenantsService.getTemplates(id);
  }

  @Post(':id/templates')
  async updateTemplateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    data: {
      layer: number;
      templateName: string;
      status: string;
      fileUrl?: string;
    },
  ) {
    await this.assertCanAccess(req, id);
    return this.tenantsService.updateTemplateStatus(id, data);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    // Exclusão de escritório é destrutiva (DROP SCHEMA CASCADE) e irreversível.
    this.assertAdmin(req);

    // Impede que o admin exclua o próprio tenant "casa" por engano.
    if (req.user?.tenantId === id) {
      throw new ForbiddenException(
        'Você não pode excluir o seu próprio escritório base (Workspace principal).',
      );
    }

    return this.tenantsService.remove(id);
  }
}
