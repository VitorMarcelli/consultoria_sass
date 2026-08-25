import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

// Wrapper fino sobre o provedor de IA usado para sugerir notas de
// complexidade. Mesmo espírito do padrão já validado em
// opportunities.service.ts (chave via env; ausência de chave é fallback
// silencioso — nunca lança erro, só deixa de sugerir), mas usando o
// structured output nativo do SDK da Anthropic (client.messages.parse +
// output_config.format) em vez de pedir "responda em JSON" no prompt e
// fazer strip de markdown na mão — o schema Zod já garante o shape da
// resposta, então não há parsing manual nem risco de JSON malformado.
// Isolado numa classe própria para trocar de provedor sem tocar no resto
// do módulo — só este arquivo conhece o SDK concreto.
@Injectable()
export class ComplexityAiLlmClient {
  private readonly logger = new Logger(ComplexityAiLlmClient.name);

  // claude-opus-5 é o modelo recomendado por padrão (maior capacidade
  // analítica) — configurável via ANTHROPIC_MODEL para quem quiser trocar
  // por um modelo mais barato em lotes muito grandes.
  private readonly defaultModel = 'claude-opus-5';

  // Modo mock: permite testar o fluxo inteiro (sugerir → aceitar →
  // CCA/CCR) sem chave de API e sem custo. Gera notas determinísticas a
  // partir do próprio prompt (mesmo cliente/frente sempre produz o mesmo
  // resultado) — não chama nenhum provedor de IA. Nunca ativar em produção:
  // é só para desenvolvimento/homologação.
  private isMockMode(): boolean {
    return process.env.COMPLEXITY_AI_MOCK === 'true';
  }

  isConfigured(): boolean {
    return this.isMockMode() || !!process.env.ANTHROPIC_API_KEY;
  }

  get modelIdentifier(): string {
    if (this.isMockMode()) return 'mock';
    return process.env.ANTHROPIC_MODEL || this.defaultModel;
  }

  async generateStructured<T extends z.ZodTypeAny>(
    prompt: string,
    schema: T,
  ): Promise<z.infer<T> | null> {
    if (this.isMockMode()) {
      return this.generateMock(prompt, schema);
    }

    if (!process.env.ANTHROPIC_API_KEY) return null;

    try {
      const client = new Anthropic();
      const response = await client.messages.parse({
        model: this.modelIdentifier,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
        output_config: { format: zodOutputFormat(schema) },
      });

      if (response.parsed_output === null) {
        this.logger.warn(
          'Resposta da IA não bateu com o schema esperado (parsed_output null).',
        );
        return null;
      }
      return response.parsed_output;
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        this.logger.error(`Chave da Anthropic inválida: ${error.message}`);
      } else if (error instanceof Anthropic.RateLimitError) {
        this.logger.warn(`Rate limit da Anthropic atingido: ${error.message}`);
      } else if (error instanceof Anthropic.APIError) {
        this.logger.warn(`Erro da API Anthropic: ${error.message}`);
      } else {
        this.logger.warn(
          `Falha ao gerar sugestão de complexidade via IA: ${(error as Error).message}`,
        );
      }
      return null;
    }
  }

  // Hash simples e estável (mesmo prompt + mesma chave de critério sempre
  // produz a mesma nota 1-3) — só para dar variedade plausível ao testar
  // manualmente vários clientes, sem depender de nenhuma IA de verdade.
  private hashScore(input: string): 1 | 2 | 3 {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash * 31 + input.charCodeAt(i)) % 997;
    }
    return ((hash % 3) + 1) as 1 | 2 | 3;
  }

  private generateMock<T extends z.ZodTypeAny>(
    prompt: string,
    schema: T,
  ): z.infer<T> {
    // Só ZodObject é usado por este módulo (ver prompts/build-prompt.ts,
    // buildOutputSchema) — acesso via shape em vez de generics mais
    // estritos pra não acoplar este arquivo à versão exata do Zod.
    const shape: Record<string, unknown> =
      (schema as unknown as { shape?: Record<string, unknown> }).shape ?? {};

    const result: Record<string, { score: 1 | 2 | 3; justification: string }> =
      {};
    for (const key of Object.keys(shape)) {
      result[key] = {
        score: this.hashScore(prompt + key),
        justification:
          'Sugestão de teste gerada em modo mock (COMPLEXITY_AI_MOCK=true) — não é uma chamada real de IA.',
      };
    }
    return result as z.infer<T>;
  }
}
