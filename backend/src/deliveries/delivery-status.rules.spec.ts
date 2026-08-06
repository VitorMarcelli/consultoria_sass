import {
  computeStatusObrigacao,
  computeStatusAgenda,
} from './delivery-status.rules';

const NOW = new Date('2026-06-15T12:00:00Z');
const BEFORE = new Date('2026-06-10T12:00:00Z');
const AFTER = new Date('2026-06-20T12:00:00Z');
const LEGAL = new Date('2026-06-20T12:00:00Z'); // Vencimento
const INTERNAL = new Date('2026-06-15T12:00:00Z'); // Prazo Interno (= NOW, borda)
const EXEC = new Date('2026-06-12T12:00:00Z'); // Data Prevista

describe('computeStatusObrigacao', () => {
  it('CT-001: não realizada, dentro do Prazo Interno → PEND', () => {
    const result = computeStatusObrigacao({
      legalDeadline: LEGAL,
      internalDeadline: AFTER, // ainda não passou
      executionDeadline: null,
      completedAt: null,
      now: NOW,
    });
    expect(result).toBe('PEND');
  });

  it('CT-002: realizada antes do Prazo Interno → OK_INTERNO', () => {
    const result = computeStatusObrigacao({
      legalDeadline: LEGAL,
      internalDeadline: INTERNAL,
      executionDeadline: null,
      completedAt: BEFORE,
      now: NOW,
    });
    expect(result).toBe('OK_INTERNO');
  });

  it('CT-003: realizada após o Prazo Interno mas até o Vencimento → OK_LEGAL', () => {
    const result = computeStatusObrigacao({
      legalDeadline: LEGAL,
      internalDeadline: BEFORE,
      executionDeadline: null,
      completedAt: NOW, // depois do interno (BEFORE), antes/igual ao legal (LEGAL=AFTER)
      now: NOW,
    });
    expect(result).toBe('OK_LEGAL');
  });

  it('CT-004: realizada após o Vencimento → OK_ATRASADO', () => {
    const result = computeStatusObrigacao({
      legalDeadline: BEFORE,
      internalDeadline: BEFORE,
      executionDeadline: null,
      completedAt: AFTER,
      now: NOW,
    });
    expect(result).toBe('OK_ATRASADO');
  });

  it('CT-005: não realizada, passou do Prazo Interno mas não do Vencimento → ATR_INTERNO', () => {
    const result = computeStatusObrigacao({
      legalDeadline: AFTER,
      internalDeadline: BEFORE,
      executionDeadline: null,
      completedAt: null,
      now: NOW,
    });
    expect(result).toBe('ATR_INTERNO');
  });

  it('CT-006: não realizada, passou do Vencimento → ATR_VENCIMENTO', () => {
    const result = computeStatusObrigacao({
      legalDeadline: BEFORE,
      internalDeadline: BEFORE,
      executionDeadline: null,
      completedAt: null,
      now: NOW,
    });
    expect(result).toBe('ATR_VENCIMENTO');
  });

  it('CT-007: dado legado sem nenhuma data, realizada → OK_INTERNO (fallback, nunca lança)', () => {
    const result = computeStatusObrigacao({
      legalDeadline: null,
      internalDeadline: null,
      executionDeadline: null,
      completedAt: NOW,
      now: NOW,
    });
    expect(result).toBe('OK_INTERNO');
  });

  it('CT-008: dado legado sem Vencimento, Prazo Interno perdido, realizada → OK_INTERNO (sem base pra provar atraso legal)', () => {
    const result = computeStatusObrigacao({
      legalDeadline: null,
      internalDeadline: BEFORE,
      executionDeadline: null,
      completedAt: AFTER,
      now: NOW,
    });
    expect(result).toBe('OK_INTERNO');
  });

  it('CT-009: dado legado sem nenhuma data, não realizada → PEND (nunca lança)', () => {
    const result = computeStatusObrigacao({
      legalDeadline: null,
      internalDeadline: null,
      executionDeadline: null,
      completedAt: null,
      now: NOW,
    });
    expect(result).toBe('PEND');
  });
});

describe('computeStatusAgenda', () => {
  it('CT-010: não realizada, dentro da Data Prevista → PEND', () => {
    const result = computeStatusAgenda({
      legalDeadline: null,
      internalDeadline: null,
      executionDeadline: AFTER,
      completedAt: null,
      now: NOW,
    });
    expect(result).toBe('PEND');
  });

  it('CT-011: realizada até a Data Prevista → OK_DENTRO_AGENDA', () => {
    const result = computeStatusAgenda({
      legalDeadline: null,
      internalDeadline: null,
      executionDeadline: EXEC,
      completedAt: BEFORE,
      now: NOW,
    });
    expect(result).toBe('OK_DENTRO_AGENDA');
  });

  it('CT-012: realizada depois da Data Prevista → OK_FORA_AGENDA', () => {
    const result = computeStatusAgenda({
      legalDeadline: null,
      internalDeadline: null,
      executionDeadline: EXEC,
      completedAt: NOW,
      now: NOW,
    });
    expect(result).toBe('OK_FORA_AGENDA');
  });

  it('CT-013: não realizada, passou da Data Prevista → ATR', () => {
    const result = computeStatusAgenda({
      legalDeadline: null,
      internalDeadline: null,
      executionDeadline: EXEC,
      completedAt: null,
      now: NOW,
    });
    expect(result).toBe('ATR');
  });

  it('CT-014: dado legado sem Data Prevista, realizada → OK_DENTRO_AGENDA (fallback, nunca lança)', () => {
    const result = computeStatusAgenda({
      legalDeadline: null,
      internalDeadline: null,
      executionDeadline: null,
      completedAt: NOW,
      now: NOW,
    });
    expect(result).toBe('OK_DENTRO_AGENDA');
  });
});
