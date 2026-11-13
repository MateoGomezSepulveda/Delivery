import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import {
  DeliveryLayout,
  DeliveryLayoutPreview,
} from '@/components/layout/DeliveryLayout';
import {
  AdminLayout,
  AdminLayoutPreview,
} from '@/components/layout/AdminLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { RoleGuard } from '@/routes/RoleGuard';
import { PhaseZeroShowcasePage } from '@/pages/PhaseZeroShowcasePage';
import { CatalogPage } from '@/pages/client/CatalogPage';
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

          {/* Rutas Protegidas de Usuario Autenticado */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Portal Repartidor (Protegido por Rol DELIVERY o ADMIN) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<RoleGuard allowedRoles={['DELIVERY', 'ADMIN']} />}>
            <Route path="/delivery" element={<DeliveryLayout />}>
              <Route index element={<DeliveryLayoutPreview />} />
            </Route>
          </Route>
        </Route>

        {/* Portal Administrador (Protegido por Rol ADMIN) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<RoleGuard allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminLayoutPreview />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
