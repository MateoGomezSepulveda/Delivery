import { formatCurrency } from '@/utils/formatters';
import { calculateUnitProfit, getProductStockState } from '@/utils/inventory';
import { formatPhoneDisplay, validatePhoneNumber } from '@/utils/phone';

describe('mobile shared utilities', () => {
  it('formats COP currency cleanly', () => {
    const formatted = formatCurrency(48900);
    expect(formatted).toContain('48.900');
  });

  it('validates and formats Colombian phone numbers', () => {
    expect(validatePhoneNumber('')).toBe('El número de celular es obligatorio.');
    expect(validatePhoneNumber('12345')).toContain('válido');
    expect(validatePhoneNumber('300 123 4567')).toBeNull();
    expect(formatPhoneDisplay('+573001234567')).toBe('+57 300 123 4567');
  });

  it('computes product stock warnings and unit profitability', () => {
    const low = getProductStockState({
      available: true,
      stock: 3,
      lowStockThreshold: 5,
    });
    expect(low.isOutOfStock).toBe(false);
    expect(low.isLowStock).toBe(true);
    expect(low.lowStockLabel).toBe('¡Solo quedan 3 unidades!');

    const out = getProductStockState({
      available: true,
      stock: 0,
      lowStockThreshold: 5,
    });
    expect(out.isOutOfStock).toBe(true);

    const profit = calculateUnitProfit(50000, 35000);
    expect(profit.unitProfit).toBe(15000);
    expect(profit.marginPercent).toBe(30);
  });
});
