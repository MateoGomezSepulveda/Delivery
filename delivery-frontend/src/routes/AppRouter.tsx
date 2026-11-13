import { Suspense, lazy, type ComponentType } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { DeliveryLayout } from '@/components/layout/DeliveryLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { RoleGuard } from '@/routes/RoleGuard';

const pickExport =
  <T extends Record<string, unknown>, K extends keyof T>(key: K) =>
  (module: T): { default: ComponentType } => ({
    default: module[key] as ComponentType,
  });

const LoginPage = lazy(() =>
  import('@/pages/auth/LoginPage').then(pickExport('LoginPage')),
);
const RegisterPage = lazy(() =>
  import('@/pages/auth/RegisterPage').then(pickExport('RegisterPage')),
);
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/ForgotPasswordPage').then(
    pickExport('ForgotPasswordPage'),
  ),
);
const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/ResetPasswordPage').then(
    pickExport('ResetPasswordPage'),
  ),
);

const CatalogPage = lazy(() =>
  import('@/pages/client/CatalogPage').then(pickExport('CatalogPage')),
);
const PhaseZeroShowcasePage = lazy(() =>
  import('@/pages/PhaseZeroShowcasePage').then(
    pickExport('PhaseZeroShowcasePage'),
  ),
);
const PaymentResultPage = lazy(() =>
  import('@/pages/client/PaymentResultPage').then(
    pickExport('PaymentResultPage'),
  ),
);
const ProfilePage = lazy(() =>
  import('@/pages/client/ProfilePage').then(pickExport('ProfilePage')),
);
const CheckoutPage = lazy(() =>
  import('@/pages/client/CheckoutPage').then(pickExport('CheckoutPage')),
);
const MyOrdersPage = lazy(() =>
  import('@/pages/client/MyOrdersPage').then(pickExport('MyOrdersPage')),
);
const OrderDetailPage = lazy(() =>
  import('@/pages/client/OrderDetailPage').then(pickExport('OrderDetailPage')),
);

const RiderAvailableOrdersPage = lazy(() =>
  import('@/pages/delivery/RiderAvailableOrdersPage').then(
    pickExport('RiderAvailableOrdersPage'),
  ),
);
const RiderActiveRoutePage = lazy(() =>
  import('@/pages/delivery/RiderActiveRoutePage').then(
    pickExport('RiderActiveRoutePage'),
  ),
);
const RiderStatsPage = lazy(() =>
  import('@/pages/delivery/RiderStatsPage').then(pickExport('RiderStatsPage')),
);

const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/AdminDashboardPage').then(
    pickExport('AdminDashboardPage'),
  ),
);
const AdminOrdersPage = lazy(() =>
  import('@/pages/admin/AdminOrdersPage').then(pickExport('AdminOrdersPage')),
);
const AdminProductsPage = lazy(() =>
  import('@/pages/admin/AdminProductsPage').then(
    pickExport('AdminProductsPage'),
  ),
);
const AdminCategoriesPage = lazy(() =>
  import('@/pages/admin/AdminCategoriesPage').then(
    pickExport('AdminCategoriesPage'),
  ),
);
const AdminCouponsPage = lazy(() =>
  import('@/pages/admin/AdminCouponsPage').then(
    pickExport('AdminCouponsPage'),
  ),
);
const AdminUsersPage = lazy(() =>
  import('@/pages/admin/AdminUsersPage').then(pickExport('AdminUsersPage')),
);

function RouteLoadingFallback() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4">
      <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
        Cargando vista...
      </p>
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          {/* Rutas Públicas de Identidad (AuthLayout) */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* Portal Cliente */}
          <Route element={<ClientLayout />}>
            <Route path="/" element={<CatalogPage />} />
            <Route path="/ui-lab" element={<PhaseZeroShowcasePage />} />
            <Route path="/payments/:status" element={<PaymentResultPage />} />

            {/* Rutas Protegidas de Usuario Autenticado */}
            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/orders" element={<MyOrdersPage />} />
              <Route path="/orders/:id" element={<OrderDetailPage />} />
            </Route>
          </Route>

          {/* Portal Repartidor (Protegido por Rol DELIVERY o ADMIN) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<RoleGuard allowedRoles={['DELIVERY', 'ADMIN']} />}>
              <Route path="/delivery" element={<DeliveryLayout />}>
                <Route index element={<RiderAvailableOrdersPage />} />
                <Route path="active" element={<RiderActiveRoutePage />} />
                <Route path="stats" element={<RiderStatsPage />} />
              </Route>
            </Route>
          </Route>

          {/* Portal Administrador (Protegido por Rol ADMIN) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<RoleGuard allowedRoles={['ADMIN']} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="orders" element={<AdminOrdersPage />} />
                <Route path="products" element={<AdminProductsPage />} />
                <Route path="categories" element={<AdminCategoriesPage />} />
                <Route path="coupons" element={<AdminCouponsPage />} />
                <Route path="users" element={<AdminUsersPage />} />
              </Route>
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
