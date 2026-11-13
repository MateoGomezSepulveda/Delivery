import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDateTime } from '@/utils/formatters';

describe('formatters utilities', () => {
  it('formats COP currency amounts without decimals', () => {
    const formatted = formatCurrency(28500);
    expect(formatted).toContain('28');
    expect(formatted).toContain('500');
    expect(formatted).toMatch(/\$/);

    expect(formatCurrency(0)).toMatch(/0/);
  });

  it('formats valid ISO dates and falls back gracefully on invalid dates', () => {
    const formatted = formatDateTime('2026-05-15T14:30:00.000Z');
    expect(formatted).toContain('2026');

    expect(formatDateTime('fecha-invalida')).toBe('fecha-invalida');
  });
});
