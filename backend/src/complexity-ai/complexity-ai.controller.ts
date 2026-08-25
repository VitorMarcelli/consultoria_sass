import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ComplexityAiService } from './complexity-ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantAccessGuard } from '../auth/tenant-access.guard';

@Controller('complexity')
@UseGuards(JwtAuthGuard, TenantAccessGuard)
export class ComplexityAiController {
  constructor(private readonly complexityAiService: ComplexityAiService) {}

  // Sugestão síncrona para 1 cliente/frente — uso interativo do consultor
  // revisando um cliente por vez.
  @Post('classifications/:id/ai-suggest')
  suggestOne(@Param('id') id: string, @Body('tenantId') tenantId: string) {
    return this.complexityAiService.suggestForClassification(tenantId, id);
  }

  // Lote para toda a carteira do tenant — por padrão só cobre o que ainda
  // não foi avaliado (NOT_ASSESSED/PARTIAL); force=true reprocessa tudo.
  @Post('ai-suggest-batch')
  suggestBatch(
    @Body('tenantId') tenantId: string,
    @Body('force') force?: boolean,
  ) {
    return this.complexityAiService.suggestBatchForTenant(tenantId, !!force);
  }

  // Confirma (com correções opcionais) a sugestão da IA — é isto que faz o
  // registro virar ASSESSED e passar a contar em CCA/CCR. Sem este passo, a
  // sugestão fica para sempre em AI_SUGGESTED.
  @Post('classifications/:id/ai-suggest/accept')
  acceptSuggestion(
    @Param('id') id: string,
    @Body('tenantId') tenantId: string,
    @Body('overrides') overrides: any,
    @Req() req: any,
  ) {
    return this.complexityAiService.acceptSuggestion(
      tenantId,
      id,
      req.user.id,
      overrides,
    );
  }
}
