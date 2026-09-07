/**
 * Interruptor único do limite de acessos simultâneos.
 *
 * A regra está DESLIGADA por padrão: durante os testes do mapeamento de
 * carteira ela derrubava a sessão do consultor no meio do fluxo, e o custo de
 * ficar refazendo login era maior que o ganho de segurança nesta fase.
 *
 * Nada foi removido — nem o modelo `UserSession`, nem o campo
 * `User.maxConcurrentSessions`, nem a tela de dispositivos conectados. Só a
 * imposição da regra é que passa a depender desta variável, nos dois pontos
 * onde ela agia:
 *
 *   1. auth.service.ts    — bloqueava o login novo (SESSION_LIMIT_REACHED)
 *   2. jwt-auth.guard.ts  — derrubava a requisição de uma sessão superada
 *
 * Para religar, basta definir no ambiente do backend (Render):
 *
 *   AUTH_SESSION_LIMIT_ENABLED=true
 *
 * O padrão é desligado justamente para não exigir mexer em variável de
 * ambiente para voltar ao comportamento desejado hoje. Quando o limite voltar
 * a ser requisito, vale inverter este padrão em vez de manter a flag para
 * sempre.
 */
export function isSessionLimitEnabled(): boolean {
  return process.env.AUTH_SESSION_LIMIT_ENABLED === 'true';
}
