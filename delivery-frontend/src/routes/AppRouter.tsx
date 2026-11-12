import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ClientLayout } from '@/components/layout/ClientLayout';
import {
  DeliveryLayout,
  DeliveryLayoutPreview,
} from '@/components/layout/DeliveryLayout';
import {
  AdminLayout,
  AdminLayoutPreview,
} from '@/components/layout/AdminLayout';
import { PhaseZeroShowcasePage } from '@/pages/PhaseZeroShowcasePage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Portal Cliente */}
        <Route element={<ClientLayout />}>
          <Route path="/" element={<PhaseZeroShowcasePage />} />
        </Route>

        {/* Portal Repartidor (Mobile-First) */}
        <Route path="/delivery" element={<DeliveryLayout />}>
          <Route index element={<DeliveryLayoutPreview />} />
        </Route>

        {/* Portal Administrador */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminLayoutPreview />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
