import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminProductsPage } from '@/pages/admin/AdminProductsPage';

const mockGetProductsApi = vi.fn();
const mockCreateProductApi = vi.fn();
const mockUpdateProductApi = vi.fn();
const mockDeleteProductApi = vi.fn();
const mockGetCategoriesApi = vi.fn();

vi.mock('@/api/endpoints/products.api', () => ({
  getProductsApi: (...args: unknown[]) => mockGetProductsApi(...args),
  createProductApi: (...args: unknown[]) => mockCreateProductApi(...args),
  updateProductApi: (...args: unknown[]) => mockUpdateProductApi(...args),
  deleteProductApi: (...args: unknown[]) => mockDeleteProductApi(...args),
}));

vi.mock('@/api/endpoints/categories.api', () => ({
  getCategoriesApi: (...args: unknown[]) => mockGetCategoriesApi(...args),
}));

vi.mock('@/api/endpoints/uploads.api', () => ({
  uploadImageToS3Api: vi.fn(),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminProductsPage />
    </QueryClientProvider>,
  );
}

describe('AdminProductsPage numeric inputs in product modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCategoriesApi.mockResolvedValue({
      data: [{ _id: 'cat-1', name: 'Licores' }],
      meta: { total: 1, page: 1, lastPage: 1 },
    });
    mockCreateProductApi.mockResolvedValue({ _id: 'prod-new' });
    mockUpdateProductApi.mockResolvedValue({ _id: 'prod-1' });
  });

  it('starts price/cost empty on create and allows clearing stock and threshold without a stuck zero', async () => {
    const user = userEvent.setup();
    mockGetProductsApi.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, lastPage: 1 },
    });

    renderPage();

    const newBtn = await screen.findByRole('button', { name: /Nuevo producto/i });
    await user.click(newBtn);

    const nameInput = screen.getByLabelText(/Nombre del producto/i);
    const priceInput = screen.getByLabelText(/Precio venta \(COP\)/i);
    const costInput = screen.getByLabelText(/Precio compra \/ Costo \(COP\)/i);
    const stockInput = screen.getByLabelText(/Stock disponible \(uds\)/i);
    const thresholdInput = screen.getByLabelText(
      /Umbral de alerta por pocas unidades/i,
    );

    expect(priceInput).toHaveValue('');
    expect(costInput).toHaveValue('');
    expect(stockInput).toHaveValue('10');
    expect(thresholdInput).toHaveValue('5');

    // Clearing stock and threshold should leave them empty (not revert to 0 or 1)
    await user.clear(stockInput);
    expect(stockInput).toHaveValue('');

    await user.clear(thresholdInput);
    expect(thresholdInput).toHaveValue('');

    await user.type(nameInput, 'Whisky Reserve 750ml');
    await user.type(priceInput, '125000');
    await user.type(costInput, '82000');
    await user.type(stockInput, '24');
    await user.type(thresholdInput, '8');

    expect(priceInput).toHaveValue('125000');
    expect(costInput).toHaveValue('82000');
    expect(stockInput).toHaveValue('24');
    expect(thresholdInput).toHaveValue('8');

    await user.click(screen.getByRole('button', { name: /^Guardar$/i }));

    await waitFor(() => {
      expect(mockCreateProductApi).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Whisky Reserve 750ml',
          price: 125000,
          costPrice: 82000,
          stock: 24,
          lowStockThreshold: 8,
          available: true,
          categoryId: 'cat-1',
        }),
      );
    });
  });

  it('strips leading zeros when typing over 0 and preserves availability when clearing/retyping stock', async () => {
    const user = userEvent.setup();
    mockGetProductsApi.mockResolvedValue({
      data: [
        {
          _id: 'prod-1',
          name: 'Ron Viejo',
          description: 'Botella 750ml',
          price: 55000,
          costPrice: 0,
          stock: 0,
          lowStockThreshold: 5,
          available: false,
          categoryId: { _id: 'cat-1', name: 'Licores' },
        },
        {
          _id: 'prod-2',
          name: 'Cerveza Club',
          description: 'Sixpack',
          price: 22000,
          costPrice: 14000,
          stock: 10,
          lowStockThreshold: 5,
          available: true,
          categoryId: { _id: 'cat-1', name: 'Licores' },
        },
      ],
      meta: { total: 2, page: 1, lastPage: 1 },
    });

    renderPage();

    const editButtons = await screen.findAllByTitle('Editar');

    // 1. Edit product with costPrice = 0 and stock = 0
    await user.click(editButtons[0]);
    const costInput = screen.getByLabelText(/Precio compra \/ Costo \(COP\)/i);
    const stockInput = screen.getByLabelText(/Stock disponible \(uds\)/i);

    expect(costInput).toHaveValue('0');
    expect(stockInput).toHaveValue('0');

    // Typing directly without deleting 0 should strip leading zero
    await user.type(costInput, '38000');
    expect(costInput).toHaveValue('38000');

    // Clearing 0 should produce empty string, then typing 15 sets 15 and auto-reactivates
    await user.clear(stockInput);
    expect(stockInput).toHaveValue('');
    await user.type(stockInput, '15');
    expect(stockInput).toHaveValue('15');

    await user.click(screen.getByRole('button', { name: /^Guardar$/i }));
    await waitFor(() => {
      expect(mockUpdateProductApi).toHaveBeenCalledWith(
        'prod-1',
        expect.objectContaining({
          price: 55000,
          costPrice: 38000,
          stock: 15,
          available: true,
        }),
      );
    });

    // 2. Edit active product: clearing stock to retype should NOT accidentally disable availability
    await user.click(editButtons[1]);
    const stockInput2 = screen.getByLabelText(/Stock disponible \(uds\)/i);
    await user.clear(stockInput2);
    expect(stockInput2).toHaveValue('');
    await user.type(stockInput2, '30');

    await user.click(screen.getByRole('button', { name: /^Guardar$/i }));
    await waitFor(() => {
      expect(mockUpdateProductApi).toHaveBeenCalledWith(
        'prod-2',
        expect.objectContaining({
          stock: 30,
          available: true,
        }),
      );
    });
  });

  it('prevents submitting when sale price is left empty', async () => {
    const user = userEvent.setup();
    mockGetProductsApi.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, lastPage: 1 },
    });

    renderPage();

    await user.click(await screen.findByRole('button', { name: /Nuevo producto/i }));
    await user.type(screen.getByLabelText(/Nombre del producto/i), 'Producto Sin Precio');
    await user.click(screen.getByRole('button', { name: /^Guardar$/i }));

    expect(mockCreateProductApi).not.toHaveBeenCalled();
  });
});
