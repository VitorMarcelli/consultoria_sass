import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ClientCatalogService } from './client-catalog.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CatalogBlock } from './client-catalog.types';

// Sem TenantAccessGuard de propósito: o catálogo é estático e igual para
// todos os escritórios, não há dado de tenant a proteger aqui.
@Controller('client-catalog')
@UseGuards(JwtAuthGuard)
export class ClientCatalogController {
  constructor(private readonly catalog: ClientCatalogService) {}

  // Estrutura completa do formulário, já dividida em blocos.
  @Get()
  getFormStructure() {
    return this.catalog.getFormStructure();
  }

  // Quais campos formam CC e CO em cada frente.
  @Get('composition')
  getComposition() {
    return this.catalog.getIndexComposition();
  }

  @Get('block/:block')
  getBlock(@Param('block') block: string) {
    return this.catalog.getFieldsByBlock(block.toUpperCase() as CatalogBlock);
  }
}
