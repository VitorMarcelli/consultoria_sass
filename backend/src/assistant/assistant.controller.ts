import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AssistantService, ChatMessage } from './assistant.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantAccessGuard } from '../auth/tenant-access.guard';

@Controller('assistant')
@UseGuards(JwtAuthGuard, TenantAccessGuard)
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  // `messages` é o histórico completo da conversa (mantido no frontend,
  // sem persistência no backend por enquanto — reseta ao atualizar a
  // página). tenantId nunca é repassado pra dentro do prompt/tools como
  // parâmetro do modelo — só usado aqui pra resolver o Prisma do tenant.
  @Post('chat')
  chat(
    @Body('tenantId') tenantId: string,
    @Body('messages') messages: ChatMessage[],
  ) {
    return this.assistantService.chat(tenantId, messages || []);
  }
}
