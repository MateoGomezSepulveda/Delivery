import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductCard } from '@/components/catalog/ProductCard';
import type { Product } from '@/types/catalog.types';

const baseProduct: Product = {
  _id: 'prod-1',
  name: 'Vino Tinto Reserva',
  description: 'Vino tinto chileno con notas de frutos rojos',
  price: 68000,
  costPrice: 42000,
  stock: 12,
  lowStockThreshold: 5,
  available: true,
  categoryId: { _id: 'cat-1', name: 'Vinos y Cervezas' },
};

describe('ProductCard inventory indicators', () => {
  it('shows exact remaining count alert when stock is low', () => {
    render(
      <ProductCard
        product={{ ...baseProduct, stock: 3 }}
        onSelectProduct={vi.fn()}
        onAddToCart={vi.fn()}
      />,
    );

    expect(screen.getByText('¡Solo quedan 3 unidades!')).toBeInTheDocument();
    expect(screen.getByText('Quedan 3 uds')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /agregar/i })).toBeEnabled();
  });

  it('automatically marks product as Agotado and disables Add button when stock reaches 0', () => {
    render(
      <ProductCard
        product={{ ...baseProduct, stock: 0, available: true }}
        onSelectProduct={vi.fn()}
        onAddToCart={vi.fn()}
      />,
    );

    const addBtn = screen.getByRole('button', { name: /agotado/i });
    expect(addBtn).toBeDisabled();
    expect(screen.queryByText(/solo quedan/i)).not.toBeInTheDocument();
  });
});
