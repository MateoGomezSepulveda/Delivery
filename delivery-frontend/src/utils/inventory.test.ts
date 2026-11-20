import { describe, expect, it } from 'vitest';
import {
  calculateUnitProfit,
  getProductStockState,
} from '@/utils/inventory';

describe('inventory utils', () => {
  it('marks product as out of stock when stock is 0 even if available flag is true', () => {
    const state = getProductStockState({
      available: true,
      stock: 0,
      lowStockThreshold: 5,
    });
    expect(state.isOutOfStock).toBe(true);
    expect(state.isLowStock).toBe(false);
    expect(state.lowStockLabel).toBeNull();
  });

  it('returns low stock urgency message when stock is within threshold', () => {
    const state = getProductStockState({
      available: true,
      stock: 3,
      lowStockThreshold: 5,
    });
    expect(state.isOutOfStock).toBe(false);
    expect(state.isLowStock).toBe(true);
    expect(state.lowStockLabel).toBe('¡Solo quedan 3 unidades!');

    const lastOne = getProductStockState({
      available: true,
      stock: 1,
      lowStockThreshold: 5,
    });
    expect(lastOne.lowStockLabel).toBe('¡Última unidad disponible!');
  });

  it('calculates real unit profit and margin percentage accurately', () => {
    expect(calculateUnitProfit(165000, 110000)).toEqual({
      unitProfit: 55000,
      marginPercent: 33.3,
    });

    expect(calculateUnitProfit(20000, 25000)).toEqual({
      unitProfit: -5000,
      marginPercent: -25,
    });
  });
});
