import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AssistantDataService } from './data.service';
import { buildAssistantTools } from './tools';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Regra de segurança central deste módulo: o tenantId NUNCA é um campo que a
// IA pode preencher. Ele é resolvido uma vez, a partir da sessão autenticada
// (mesmo TenantAccessGuard do resto do backend), e fechado por closure nas
// tools (ver tools.ts) — a IA fisicamente não tem como pedir dado de outro
// escritório, porque nenhuma ferramenta aceita esse parâmetro.
const SYSTEM_PROMPT = `Você é o assistente de operações da Sevilha Performance, uma consultoria para escritórios de contabilidade. Você responde perguntas de consultores sobre a carteira de clientes de UM escritório específico, usando SOMENTE as ferramentas disponíveis — nunca invente números, nomes de clientes, classes de complexidade ou percentuais que não vieram de uma chamada de ferramenta.

Se uma ferramenta retornar um campo "error" (ex: "nenhum ciclo aberto", "cliente não encontrado"), explique isso ao usuário com clareza em vez de inventar dados.

Responda sempre em português, de forma direta e objetiva, citando os números concretos que as ferramentas retornaram.`;

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private readonly defaultModel = 'claude-opus-5';

  constructor(private readonly dataService: AssistantDataService) {}

  private isMockMode(): boolean {
    return process.env.ASSISTANT_AI_MOCK === 'true';
  }

  isConfigured(): boolean {
    return this.isMockMode() || !!process.env.ANTHROPIC_API_KEY;
  }

  async chat(
    tenantId: string,
    history: ChatMessage[],
  ): Promise<{ reply: string }> {
    if (!this.isConfigured()) {
      return {
        reply: 'O assistente de IA ainda não está configurado (chave ausente).',
      };
    }
    if (!history || history.length === 0) {
      return { reply: 'Faça uma pergunta sobre a carteira do escritório.' };
    }

    if (this.isMockMode()) {
      return this.chatMock(tenantId);
    }

    const tools = buildAssistantTools(this.dataService, tenantId);

    try {
      const client = new Anthropic();
      const finalMessage = await client.beta.messages.toolRunner({
        model: this.defaultModel,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools,
        messages: history.map((m) => ({ role: m.role, content: m.content })),
      });

      const textBlock = finalMessage.content.find(
        (block: any) => block.type === 'text',
      ) as { text: string } | undefined;

      return { reply: textBlock?.text || '(o assistente não retornou texto)' };
    } catch (error) {
      this.logger.warn(
        `Falha no assistente de IA: ${(error as Error).message}`,
      );
      return {
        reply:
          'Não consegui processar sua pergunta agora — tente novamente em instantes.',
      };
    }
  }

  // Modo mock: exercita as tools de verdade contra o banco do tenant (prova
  // que o isolamento e as consultas funcionam) sem chamar nenhuma IA.
  private async chatMock(tenantId: string): Promise<{ reply: string }> {
    const portfolio = await this.dataService.portfolioOverview(tenantId);
    const capacity = await this.dataService.capacityOverview(tenantId);
    return {
      reply:
        `[Modo mock — COMPLEXITY_AI_MOCK/ASSISTANT_AI_MOCK ativo, sem chamada real de IA]\n\n` +
        `get_portfolio_overview(): ${JSON.stringify(portfolio)}\n\n` +
        `get_capacity_overview(): ${JSON.stringify(capacity)}`,
    };
  }
}
