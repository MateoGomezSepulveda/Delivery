import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuthStore } from '@/store/useAuthStore';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function renderAdminLayout() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={['/admin']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AdminLayout />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminLayout', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        _id: 'admin-1',
        name: 'Mateo Zapata',
        email: 'mateo@deliverypro.com',
        role: 'ADMIN',
        avatarUrl: 'https://cdn.example.com/mateo-avatar.jpg',
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
      isHydrating: false,
    });
  });

  it('displays the authenticated admin name and avatar photo instead of DeliveryAdmin', () => {
    renderAdminLayout();

    expect(screen.queryByText('DeliveryAdmin')).not.toBeInTheDocument();
    expect(screen.getAllByText('Mateo Zapata').length).toBeGreaterThan(0);

    const avatars = screen.getAllByRole('img', { name: 'Mateo Zapata' });
    expect(avatars.length).toBeGreaterThan(0);
    expect(avatars[0]).toHaveAttribute(
      'src',
      'https://cdn.example.com/mateo-avatar.jpg',
    );
  });

  it('renders initials fallback when admin has no avatarUrl', () => {
    useAuthStore.setState({
      user: {
        _id: 'admin-2',
        name: 'Laura Admin',
        email: 'laura@deliverypro.com',
        role: 'ADMIN',
      },
    });

    renderAdminLayout();

    expect(screen.getAllByText('Laura Admin').length).toBeGreaterThan(0);
    expect(screen.getAllByText('LA').length).toBeGreaterThan(0);
  });
});
