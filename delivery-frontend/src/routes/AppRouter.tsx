import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { DeliveryLayout } from '@/components/layout/DeliveryLayout';
import { RiderAvailableOrdersPage } from '@/pages/delivery/RiderAvailableOrdersPage';
import { RiderActiveRoutePage } from '@/pages/delivery/RiderActiveRoutePage';
import { RiderStatsPage } from '@/pages/delivery/RiderStatsPage';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminOrdersPage } from '@/pages/admin/AdminOrdersPage';
import { AdminProductsPage } from '@/pages/admin/AdminProductsPage';
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage';
import { AdminCouponsPage } from '@/pages/admin/AdminCouponsPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { RoleGuard } from '@/routes/RoleGuard';
import { PhaseZeroShowcasePage } from '@/pages/PhaseZeroShowcasePage';
import { CatalogPage } from '@/pages/client/CatalogPage';
import { CheckoutPage } from '@/pages/client/CheckoutPage';
import { MyOrdersPage } from '@/pages/client/MyOrdersPage';
import { OrderDetailPage } from '@/pages/client/OrderDetailPage';
import { PaymentResultPage } from '@/pages/client/PaymentResultPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { ProfilePage } from '@/pages/client/ProfilePage';

export function AppRouter() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
