import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CouponInputBox } from '@/components/cart/CouponInputBox';
import { useCartDrawerStore } from '@/store/useCartDrawerStore';

const mockApplyCouponApi = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/api/endpoints/coupons.api', () => ({
  applyCouponApi: (...args: unknown[]) => mockApplyCouponApi(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

describe('CouponInputBox', () => {
  beforeEach(() => {
    useCartDrawerStore.setState({ appliedCoupon: null });
    vi.clearAllMocks();
  });

  it('shows error toast when submitting an empty coupon code', async () => {
    const user = userEvent.setup();
    render(<CouponInputBox orderTotal={45000} />);

    await user.click(screen.getByRole('button', { name: /aplicar/i }));

    expect(mockApplyCouponApi).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith(
      'Ingresa un código promocional.',
    );
  });

  it('applies valid coupon in uppercase, renders badge, and allows removing it', async () => {
    const user = userEvent.setup();
    mockApplyCouponApi.mockResolvedValue({
      code: 'VERANO20',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      originalTotal: 50000,
      discountAmount: 10000,
      finalTotal: 40000,
    });

    render(<CouponInputBox orderTotal={50000} />);

    const input = screen.getByPlaceholderText(/código de cupón/i);
    await user.type(input, 'verano20');
    expect(input).toHaveValue('VERANO20');

    await user.click(screen.getByRole('button', { name: /aplicar/i }));

    await waitFor(() => {
      expect(mockApplyCouponApi).toHaveBeenCalledWith('VERANO20', 50000);
    });

    expect(
      await screen.findByText(/Cupón VERANO20 aplicado/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Descuento:/i)).toBeInTheDocument();
    expect(useCartDrawerStore.getState().appliedCoupon?.discountAmount).toBe(
      10000,
    );

    await user.click(screen.getByTitle('Quitar cupón'));
    expect(useCartDrawerStore.getState().appliedCoupon).toBeNull();
    expect(screen.getByPlaceholderText(/código de cupón/i)).toBeInTheDocument();
  });

  it('displays error toast when backend rejects the coupon', async () => {
    const user = userEvent.setup();
    mockApplyCouponApi.mockRejectedValue(new Error('Cupón expirado'));

    render(<CouponInputBox orderTotal={30000} />);

    await user.type(screen.getByPlaceholderText(/código de cupón/i), 'EXPIRADO');
    await user.click(screen.getByRole('button', { name: /aplicar/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Cupón no válido',
        expect.objectContaining({
          description: expect.any(String),
        }),
      );
    });
    expect(useCartDrawerStore.getState().appliedCoupon).toBeNull();
  });
});
