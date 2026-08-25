import { z } from 'zod';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { AssistantDataService } from './data.service';

const FRONT_ENUM = z.enum(['Fiscal', 'Contábil', 'Pessoal']);

// Ferramentas do assistente — todas só-leitura, e o tenantId é fechado por
// closure aqui, nunca um campo do schema de input. A IA não tem como pedir
// dado de outro escritório porque essa opção simplesmente não existe no
// shape que ela pode preencher (ver ADR no assistant.service.ts).
export function buildAssistantTools(
  dataService: AssistantDataService,
  tenantId: string,
) {
  return [
    betaZodTool({
      name: 'get_portfolio_overview',
      description:
        'Retorna visão geral da carteira de clientes do escritório no ciclo de gestão atual: cobertura, distribuição por classe de complexidade (C1-C5), quantidade de C0/pendentes, CCA (coeficiente médio da área) e CCR por responsável. Chame para perguntas sobre "quantos clientes", "distribuição de complexidade", "quantos estão em C5", "carteira por regime/segmento". Se front não for informado, retorna as 3 frentes.',
      inputSchema: z.object({
        front: FRONT_ENUM.optional().describe(
          'Frente específica a consultar. Omita para consultar todas as frentes.',
        ),
      }),
      run: async ({ front }) =>
        JSON.stringify(await dataService.portfolioOverview(tenantId, front)),
    }),
    betaZodTool({
      name: 'get_capacity_overview',
      description:
        'Retorna a ocupação de cada colaborador alocado no ciclo atual: horas disponíveis vs. comprometidas e status (OVERLOADED, IDLE ou BALANCED). Chame para perguntas sobre "quem está sobrecarregado", "capacidade da equipe", "ociosidade", "quem pode receber mais clientes".',
      inputSchema: z.object({
        front: FRONT_ENUM.optional().describe(
          'Frente específica. Omita para ver a equipe inteira.',
        ),
      }),
      run: async ({ front }) =>
        JSON.stringify(await dataService.capacityOverview(tenantId, front)),
    }),
    betaZodTool({
      name: 'find_clients',
      description:
        'Busca clientes da carteira por filtros combináveis: frente, classe de complexidade (C0-C5), status do cliente (ACTIVE/INACTIVE) e/ou nome do responsável principal. Use para "quais clientes estão em C5 na Fiscal", "clientes do João", "clientes inativos".',
      inputSchema: z.object({
        front: FRONT_ENUM.optional(),
        complexityClass: z
          .enum(['C0', 'C1', 'C2', 'C3', 'C4', 'C5'])
          .optional(),
        status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
        ownerName: z
          .string()
          .optional()
          .describe('Nome (ou parte do nome) do responsável principal.'),
      }),
      run: async (filters) =>
        JSON.stringify(await dataService.findClients(tenantId, filters)),
    }),
    betaZodTool({
      name: 'get_client_detail',
      description:
        'Retorna o detalhe completo de UM cliente específico pelo nome: notas de complexidade por critério (Volume, Atendimento, Tributação/Rotatividade, Organização) em cada frente que ele atua, classe final, responsáveis, e a justificativa que o Agente de IA gerou para cada nota (quando existir). Use para "por que esse cliente ficou C3?" ou qualquer pergunta sobre um cliente nomeado.',
      inputSchema: z.object({
        clientName: z
          .string()
          .describe('Nome ou parte da razão social do cliente.'),
      }),
      run: async ({ clientName }) =>
        JSON.stringify(await dataService.clientDetail(tenantId, clientName)),
    }),
  ];
}
