import { IsInt, Min } from 'class-validator';

export class UpdateAccessLimitDto {
  // Mínimo 1, nunca 0 — 0 travaria a conta pra sempre sem nenhum jeito de
  // logar de novo (isso seria "desativar conta", não "limitar acessos").
  @IsInt()
  @Min(1, { message: 'O limite de acessos deve ser no mínimo 1.' })
  maxConcurrentSessions: number;
}
