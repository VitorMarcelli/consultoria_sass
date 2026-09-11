import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CcCoService } from './cc-co.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantAccessGuard } from '../auth/tenant-access.guard';

@Controller('cc-co')
@UseGuards(JwtAuthGuard, TenantAccessGuard)
export class CcCoController {
  constructor(private readonly ccCo: CcCoService) {}

  // Salva as respostas do catálogo e devolve a avaliação já recalculada.
  // É o endpoint que o formulário de cadastro usa a cada passo.
  @Post('clients/:clientId/fronts/:frontId/answers')
  saveAnswers(
    @Param('clientId') clientId: string,
    @Param('frontId') frontId: string,
    @Body() body: any,
  ) {
    return this.ccCo.saveAnswers(body.tenantId, clientId, frontId, {
      profileType: body.profileType,
      masterAnswers: body.masterAnswers,
      frontAnswers: body.frontAnswers,
      primaryOwnerId: body.primaryOwnerId,
      secondaryOwnerId: body.secondaryOwnerId,
    });
  }

  // Grava as respostas de várias frentes numa requisição só. É o que o
  // cadastro usa: enviar uma por frente repetia o bloco MESTRE a cada
  // chamada e multiplicava as idas ao banco.
  @Post('clients/:clientId/answers')
  saveAllAnswers(@Param('clientId') clientId: string, @Body() body: any) {
    return this.ccCo.saveClientAnswers(body.tenantId, clientId, {
      profileType: body.profileType,
      masterAnswers: body.masterAnswers,
      fronts: body.fronts ?? [],
    });
  }

  // Força o recálculo de uma frente sem alterar resposta nenhuma.
  @Post('clients/:clientId/fronts/:frontId/assess')
  assessFront(
    @Param('clientId') clientId: string,
    @Param('frontId') frontId: string,
    @Body('tenantId') tenantId: string,
  ) {
    return this.ccCo.assessAndPersist(tenantId, clientId, frontId);
  }

  // Todas as frentes do cliente mais o consolidado. Somente leitura: não
  // recalcula nem grava. Para forçar recálculo existe o POST assess.
  @Get('clients/:clientId')
  getClient(
    @Param('clientId') clientId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.ccCo.readClientAssessment(tenantId, clientId);
  }

  // Quanto do mapeamento do M0 já foi feito e quanto falta, em respostas.
  @Get('completeness')
  getCompleteness(
    @Query('tenantId') tenantId: string,
    @Query('frontId') frontId?: string,
  ) {
    return this.ccCo.getPortfolioCompleteness(tenantId, frontId);
  }

  // Índices da carteira. Sem frontId, consolida o escritório inteiro.
  @Get('portfolio')
  getPortfolio(
    @Query('tenantId') tenantId: string,
    @Query('frontId') frontId?: string,
  ) {
    return this.ccCo.getPortfolioAssessment(tenantId, frontId);
  }
}
