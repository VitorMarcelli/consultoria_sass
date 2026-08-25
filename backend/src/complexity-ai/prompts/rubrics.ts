// Rubricas de 3 níveis por critério, no mesmo formato do único rubrico
// textual completo que já existia no acervo do cliente antes deste módulo
// (Rotatividade, aba "07_Regras_Complexidade" do template MVP REV03: três
// frases paralelas descrevendo impacto na operação, sem números). As outras
// três (Atendimento, Tributação, Organização) foram autoradas seguindo esse
// mesmo padrão, com base nas definições literais da aba "Ajuda" das planilhas
// históricas KMJ e calibradas com as correlações reais observadas nelas
// (ex.: regime Simples Nacional -> Tributação baixa; captura automática de
// XML -> Organização boa; canal manual/e-mail -> Organização pior).
//
// Nota de Volume nunca aparece aqui: é sempre derivada de um driver numérico
// (complexity.rules.ts, calculateVolumeScore) e a IA nunca a sugere.
//
// Mudar o texto de uma rubrica deve subir PROMPT_VERSION — é o que permite
// auditar, no campo aiSuggestion.promptVersion de cada classificação, com
// qual versão da regra aquela sugestão foi gerada.
export const PROMPT_VERSION = '2026-08-v1';

export interface Rubric {
  label: string;
  definition: string;
  levels: { 1: string; 2: string; 3: string };
}

export const SERVICE_RUBRIC: Rubric = {
  label: 'Atendimento',
  definition:
    'O quanto este cliente entra em contato, tira dúvidas, faz solicitações. Quanto mais demanda de atendimento, maior a nota.',
  levels: {
    1: 'Contato raro ou autônomo: poucas dúvidas ou solicitações, não exige acompanhamento ativo da equipe.',
    2: 'Contato pontual e previsível: dúvidas ou solicitações ocasionais, dentro da rotina normal de atendimento.',
    3: 'Contato frequente ou imprevisível: muitas solicitações, urgências recorrentes, exige disponibilidade e acompanhamento constante.',
  },
};

export const TAX_RUBRIC: Rubric = {
  label: 'Tributação',
  definition:
    'Há alguma particularidade que torna a empresa complexa? Qual o nível de dificuldade do fechamento em relação à tributação?',
  levels: {
    1: 'Regime e enquadramento padrão (ex.: Simples Nacional em atividade única), sem regime especial nem particularidades relevantes de apuração.',
    2: 'Enquadramento que exige atenção adicional (ex.: Lucro Presumido, múltiplas atividades ou filiais) ou alguma particularidade tributária pontual, mas dentro de rotinas já conhecidas pela equipe.',
    3: 'Regime especial, múltiplos regimes/atividades combinados, ou particularidades que exigem tratamento caso a caso e risco elevado de erro no fechamento.',
  },
};

export const ORGANIZATION_RUBRIC: Rubric = {
  label: 'Organização',
  definition:
    'Quão difícil é trabalhar com este cliente? Ele envia as informações sem necessitar cobrança, com boa qualidade? Quanto mais desorganizado o cliente, maior a nota.',
  levels: {
    1: 'Envio automatizado ou integrado, cumpre prazos, informação completa e de boa qualidade — raramente precisa de cobrança.',
    2: 'Envio manual mas consistente, cumpre prazos na maior parte das vezes, ocasionalmente precisa de cobrança ou complementação de informação.',
    3: 'Envio manual e inconsistente, atraso frequente, informação incompleta ou de baixa qualidade — exige cobrança recorrente.',
  },
};

export const TURNOVER_RUBRIC: Rubric = {
  label: 'Rotatividade',
  definition:
    'Qual o nível de movimentação de funcionários (admissões e desligamentos) deste cliente?',
  levels: {
    1: 'Movimentações pouco frequentes e previsíveis, sem impacto recorrente relevante na rotina.',
    2: 'Admissões e desligamentos recorrentes, mas administráveis dentro da rotina normal.',
    3: 'Movimentações intensas ou contínuas, com imprevisibilidade, urgências e impacto relevante na operação.',
  },
};

export const RUBRIC_BY_SCORE_KEY = {
  scoreService: SERVICE_RUBRIC,
  scoreTax: TAX_RUBRIC,
  scoreOrganization: ORGANIZATION_RUBRIC,
  scoreTurnover: TURNOVER_RUBRIC,
} as const;
