import {
  computeActivityDeadlines,
  hasCompleteDeadlineRule,
} from './delivery-dates.rules';

describe('computeActivityDeadlines', () => {
  it('CT-001: regra completa → 3 datas encadeadas corretamente (execução <= interno <= legal)', () => {
    const result = computeActivityDeadlines(
      {
        legalDeadlineDay: 20,
        internalDeadlineOffsetDays: 5,
        executionDeadlineOffsetDays: 3,
      },
      '06/2026',
    );
    expect(result.legalDeadline).toEqual(new Date(2026, 6, 20)); // mês seguinte (julho, 0-indexed=6)
    expect(result.internalDeadline).toEqual(new Date(2026, 6, 15)); // 20 - 5 dias
    expect(result.executionDeadline).toEqual(new Date(2026, 6, 12)); // 15 - 3 dias
  });

  it('CT-002: sem legalDeadlineDay → as 3 datas vêm null (regra não configurada)', () => {
    const result = computeActivityDeadlines(
      {
        legalDeadlineDay: null,
        internalDeadlineOffsetDays: 5,
        executionDeadlineOffsetDays: 3,
      },
      '06/2026',
    );
    expect(result).toEqual({
      legalDeadline: null,
      internalDeadline: null,
      executionDeadline: null,
    });
  });

  it('CT-003: sem internalDeadlineOffsetDays → legal calculado, interno e execução null', () => {
    const result = computeActivityDeadlines(
      {
        legalDeadlineDay: 20,
        internalDeadlineOffsetDays: null,
        executionDeadlineOffsetDays: 3,
      },
      '06/2026',
    );
    expect(result.legalDeadline).toEqual(new Date(2026, 6, 20));
    expect(result.internalDeadline).toBeNull();
    // execução depende do interno (encadeado), não do legal direto — sem
    // interno, não há como calcular execução mesmo com offset preenchido.
    expect(result.executionDeadline).toBeNull();
  });

  it('CT-004: sem executionDeadlineOffsetDays → legal e interno calculados, execução null', () => {
    const result = computeActivityDeadlines(
      {
        legalDeadlineDay: 20,
        internalDeadlineOffsetDays: 5,
        executionDeadlineOffsetDays: null,
      },
      '06/2026',
    );
    expect(result.legalDeadline).toEqual(new Date(2026, 6, 20));
    expect(result.internalDeadline).toEqual(new Date(2026, 6, 15));
    expect(result.executionDeadline).toBeNull();
  });

  it('CT-005: virada de ano — competência 12/2026 → Vencimento em janeiro/2027', () => {
    const result = computeActivityDeadlines(
      {
        legalDeadlineDay: 10,
        internalDeadlineOffsetDays: 2,
        executionDeadlineOffsetDays: 2,
      },
      '12/2026',
    );
    expect(result.legalDeadline).toEqual(new Date(2027, 0, 10));
    expect(result.internalDeadline).toEqual(new Date(2027, 0, 8));
    expect(result.executionDeadline).toEqual(new Date(2027, 0, 6));
  });
});

describe('hasCompleteDeadlineRule', () => {
  it('CT-006: as 3 configuradas → true', () => {
    expect(
      hasCompleteDeadlineRule({
        legalDeadlineDay: 20,
        internalDeadlineOffsetDays: 5,
        executionDeadlineOffsetDays: 3,
      }),
    ).toBe(true);
  });

  it('CT-007: falta qualquer uma → false', () => {
    expect(
      hasCompleteDeadlineRule({
        legalDeadlineDay: 20,
        internalDeadlineOffsetDays: null,
        executionDeadlineOffsetDays: 3,
      }),
    ).toBe(false);
    expect(
      hasCompleteDeadlineRule({
        legalDeadlineDay: null,
        internalDeadlineOffsetDays: 5,
        executionDeadlineOffsetDays: 3,
      }),
    ).toBe(false);
  });
});
