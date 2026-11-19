import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { useAuthStore } from '@/store/useAuthStore';

const mockGetAllUsersApi = vi.fn();

vi.mock('@/api/endpoints/users.api', () => ({
  getAllUsersApi: (...args: unknown[]) => mockGetAllUsersApi(...args),
  changeUserRoleApi: vi.fn(),
  deleteUserApi: vi.fn(),
}));

describe('AdminUsersPage user avatars visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        _id: 'admin-1',
        name: 'Admin Principal',
        email: 'admin@delivery.com',
        role: 'ADMIN',
      },
      avatarsByUserId: {
        'u-local-legacy': 'data:image/jpeg;base64,legacyAvatar',
      },
    });
  });

  it('renders photos for Google users, DB-persisted non-Google users, and legacy local avatars + opens profile modal', async () => {
    const user = userEvent.setup();
    mockGetAllUsersApi.mockResolvedValue({
      data: [
        {
          _id: 'u-google',
          name: 'Ana Google',
          email: 'ana@gmail.com',
          role: 'CLIENT',
          isEmailVerified: true,
          avatarUrl: 'https://lh3.googleusercontent.com/a/photo.jpg',
        },
        {
          _id: 'u-manual',
          name: 'Carlos Manual',
          email: 'carlos@correo.com',
          role: 'CLIENT',
          phone: '3001234567',
          isEmailVerified: true,
          avatarUrl: 'data:image/jpeg;base64,uploadedAvatar',
        },
        {
          _id: 'u-local-legacy',
          name: 'Sofía Legacy',
          email: 'sofia@correo.com',
          role: 'DELIVERY',
          isEmailVerified: true,
        },
      ],
      meta: { total: 3, page: 1, lastPage: 1 },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AdminUsersPage />
      </QueryClientProvider>,
    );

    const anaImg = await screen.findByRole('img', { name: 'Ana Google' });
    const carlosImg = screen.getByRole('img', { name: 'Carlos Manual' });
    const sofiaImg = screen.getByRole('img', { name: 'Sofía Legacy' });

    expect(anaImg).toHaveAttribute(
      'src',
      'https://lh3.googleusercontent.com/a/photo.jpg',
    );
    expect(carlosImg).toHaveAttribute(
      'src',
      'data:image/jpeg;base64,uploadedAvatar',
    );
    expect(sofiaImg).toHaveAttribute(
      'src',
      'data:image/jpeg;base64,legacyAvatar',
    );

    await user.click(screen.getByTitle('Ver perfil y foto de Carlos Manual'));

    expect(await screen.findByText('Perfil de Usuario')).toBeInTheDocument();
    expect(screen.getAllByText('3001234567')).toHaveLength(2);
  });
});
