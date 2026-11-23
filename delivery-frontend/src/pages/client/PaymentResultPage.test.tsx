import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentResultPage } from '@/pages/client/PaymentResultPage';

const mockVerifyOrderPaymentApi = vi.fn();
const mockPayOrderApi = vi.fn();

vi.mock('@/api/endpoints/orders.api', () => ({
  verifyOrderPaymentApi: (...args: unknown[]) =>
    mockVerifyOrderPaymentApi(...args),
  payOrderApi: (...args: unknown[]) => mockPayOrderApi(...args),
}));

function renderPaymentResult(initialUrl: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[initialUrl]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/payments/:status" element={<PaymentResultPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PaymentResultPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls verifyOrderPaymentApi automatically when returning from MercadoPago with payment_id', async () => {
    mockVerifyOrderPaymentApi.mockResolvedValueOnce({
      orderId: '673a10000000000000000001',
      status: 'PAID',
      paymentStatus: 'PAID',
      mpStatus: 'approved',
      order: { _id: '673a10000000000000000001', status: 'PAID' },
    });

    renderPaymentResult(
      '/payments/success?external_reference=673a10000000000000000001&payment_id=987654321',
    );

    await waitFor(() => {
      expect(mockVerifyOrderPaymentApi).toHaveBeenCalledWith(
        '673a10000000000000000001',
        '987654321',
      );
    });

    expect(
      await screen.findByText('¡Tu pago fue procesado con éxito!'),
    ).toBeInTheDocument();
    expect(screen.getByText('987654321')).toBeInTheDocument();
  });

  it('switches UI to failure if backend verification reports payment was rejected', async () => {
    mockVerifyOrderPaymentApi.mockResolvedValueOnce({
      orderId: '673a10000000000000000002',
      status: 'FAILED',
      paymentStatus: 'FAILED',
      mpStatus: 'rejected',
      order: { _id: '673a10000000000000000002', status: 'FAILED' },
    });

    renderPaymentResult(
      '/payments/pending?external_reference=673a10000000000000000002&payment_id=112233',
    );

    expect(
      await screen.findByText('No pudimos procesar el pago'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /reintentar pago/i }),
    ).toBeInTheDocument();
  });
});
