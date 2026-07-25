import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TaxonomyService } from './taxonomy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('taxonomy/nodes')
@UseGuards(JwtAuthGuard)
export class TaxonomyController {
  constructor(private readonly taxonomyService: TaxonomyService) {}

  // Leitura livre para qualquer usuário autenticado: todo escritório precisa
  // enxergar a árvore global para montar seu próprio catálogo de atividades.
  @Get()
  findAll(@Query('format') format?: string) {
    return format === 'tree'
      ? this.taxonomyService.getTree()
      : this.taxonomyService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taxonomyService.findOne(id);
  }

  // Escrita restrita a Super Admin e Consultor (Sevilha): a árvore é a
  // "verdade absoluta" que permite comparar escritórios entre si, então fica
  // fora do alcance de Líderes/Responsáveis de equipe (papéis do próprio
  // escritório) e Operadores.
  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CONSULTANT')
  create(@Body() body: { name: string; parentId?: string }) {
    return this.taxonomyService.create(body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CONSULTANT')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; status?: string },
  ) {
    return this.taxonomyService.update(id, body);
  }

  @Patch(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CONSULTANT')
  deactivate(@Param('id') id: string) {
    return this.taxonomyService.deactivate(id);
  }
}
