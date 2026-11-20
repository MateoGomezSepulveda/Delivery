import type { Product } from '@/types/catalog.types';

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export interface ProductStockState {
  stock: number | null;
  lowStockThreshold: number;
  isOutOfStock: boolean;
  isLowStock: boolean;
  lowStockLabel: string | null;
}

export function getProductStockState(
  product: Pick<Product, 'available' | 'stock' | 'lowStockThreshold'>,
): ProductStockState {
  const hasStock = typeof product.stock === 'number' && !Number.isNaN(product.stock);
  const stock = hasStock ? Math.max(0, Math.floor(product.stock!)) : null;
  const lowStockThreshold =
    typeof product.lowStockThreshold === 'number' && product.lowStockThreshold > 0
      ? Math.floor(product.lowStockThreshold)
      : DEFAULT_LOW_STOCK_THRESHOLD;

  const isOutOfStock = !product.available || (stock !== null && stock <= 0);
  const isLowStock =
    !isOutOfStock && stock !== null && stock > 0 && stock <= lowStockThreshold;

  const lowStockLabel = isLowStock
    ? stock === 1
      ? '¡Última unidad disponible!'
      : `¡Solo quedan ${stock} unidades!`
    : null;

  return {
    stock,
    lowStockThreshold,
    isOutOfStock,
    isLowStock,
    lowStockLabel,
  };
}

export function calculateUnitProfit(price: number, costPrice = 0): {
  unitProfit: number;
  marginPercent: number;
} {
  const safePrice = Number.isFinite(price) ? Math.max(0, price) : 0;
  const safeCost = Number.isFinite(costPrice) ? Math.max(0, costPrice) : 0;
  const unitProfit = Number((safePrice - safeCost).toFixed(2));
  const marginPercent =
    safePrice > 0 ? Number(((unitProfit / safePrice) * 100).toFixed(1)) : 0;
  return { unitProfit, marginPercent };
}
