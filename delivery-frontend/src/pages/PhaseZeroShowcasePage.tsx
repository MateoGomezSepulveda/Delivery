import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Activity,
  Bell,
  CheckCircle2,
  Database,
  Layers,
  Lock,
  Mail,
  Palette,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { getServerHealth } from '@/api/endpoints/health.api';
import { extractErrorMessage } from '@/api/axios.client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, OrderStatusBadge, RoleBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import { useCartDrawerStore } from '@/store/useCartDrawerStore';
import type { OrderStatus } from '@/types/api.types';

const allOrderStatuses: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

export function PhaseZeroShowcasePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [demoSearch, setDemoSearch] = useState('');
  const [demoPassword, setDemoPassword] = useState('Secret123!');
  const [showSkeletons, setShowSkeletons] = useState(false);
  const { openDrawer } = useCartDrawerStore();

  const {
    data: healthData,
    isLoading: isHealthLoading,
    isError: isHealthError,
    error: healthError,
    refetch: refetchHealth,
    isFetching: isHealthFetching,
  } = useQuery({
    queryKey: ['server-health'],
    queryFn: getServerHealth,
    retry: 1,
  });

  const handleTestHealthToast = async () => {
    const result = await refetchHealth();
    if (result.data?.status === 'ok') {
      toast.success('Conexión exitosa con GET /api/v1/health', {
        description:
          'TransformInterceptor desenvuelto correctamente por axios.client.ts',
      });
    } else {
      toast.error('No se pudo conectar al Backend API', {
        description: extractErrorMessage(result.error),
      });
    }
  };

  return (
    <div className="space-y-10">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-orange-200/70 dark:border-orange-900/40 bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 p-8 sm:p-10 text-white shadow-warm">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fase 0 Completada — Design System (ui-ux-pro-max) & Core HTTP</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Arquitectura Base Lista para Conectar los 16 Módulos del Backend
          </h1>
          <p className="text-orange-50 text-sm sm:text-base leading-relaxed max-w-2xl">
            Desde este panel interactivo puedes verificar en tiempo real la
            comunicación con tu API NestJS (
            <code className="font-mono text-xs bg-black/20 px-1.5 py-0.5 rounded">
              GET /api/v1/health
            </code>
            ), probar el cambio de tema Claro/Oscuro y validar todos los
            componentes base antes de pasar a la <strong>Fase 1 (Auth & Roles)</strong>.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleTestHealthToast}
              isLoading={isHealthFetching}
              leftIcon={<RefreshCw className="w-4 h-4" />}
              className="border-white/30 bg-white text-orange-700 hover:bg-orange-50 dark:bg-slate-900 dark:text-white"
            >
              Probar Ping a /api/v1/health
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<Layers className="w-4 h-4" />}
            >
              Abrir Modal de Prueba
            </Button>
            <Button
              variant="outline"
              onClick={openDrawer}
              leftIcon={<ShoppingBag className="w-4 h-4" />}
              className="border-white/40 bg-white/10 text-white hover:bg-white/20"
            >
              Abrir Drawer del Carrito
            </Button>
          </div>
        </div>
      </section>

      {/* Bento Grid: Live Backend Health + Design System Tokens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Live Health Check from NestJS */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  Conexión en Vivo con NestJS Backend
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Endpoint: <code>GET http://localhost:3000/api/v1/health</code>
                </p>
              </div>
            </div>
            <Badge variant={!isHealthError && healthData?.status === 'ok' ? 'success' : 'danger'}>
              {isHealthLoading
                ? 'Conectando...'
                : !isHealthError && healthData?.status === 'ok'
                  ? 'Conectado (200 OK)'
                  : 'Sin Conexión'}
            </Badge>
          </div>

          <div className="rounded-xl bg-slate-950 text-slate-100 p-4 font-mono text-xs overflow-x-auto">
            {isHealthLoading ? (
              <p className="text-slate-400">
                Consultando GET /api/v1/health a través de axios.client.ts...
              </p>
            ) : isHealthError ? (
              <div className="space-y-1 text-red-400">
                <p className="font-bold">Error de conexión:</p>
                <p>{extractErrorMessage(healthError)}</p>
                <p className="text-slate-400 pt-1">
                  Tip: Ejecuta &quot;docker compose up -d&quot; en la raíz del proyecto para levantar la API.
                </p>
              </div>
            ) : (
              <pre>{JSON.stringify(healthData, null, 2)}</pre>
            )}
          </div>
        </div>

        {/* Card 2: UI/UX Pro Max Palette & Typography */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Tokens ui-ux-pro-max</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Outfit + Plus Jakarta Sans
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs font-semibold">
            <div className="rounded-xl bg-orange-600 text-white p-3">
              Primary Brand
              <span className="block text-[10px] opacity-80 font-mono mt-0.5">
                #EA580C
              </span>
            </div>
            <div className="rounded-xl bg-blue-600 text-white p-3">
              Live Tracking
              <span className="block text-[10px] opacity-80 font-mono mt-0.5">
                #2563EB
              </span>
            </div>
            <div className="rounded-xl bg-emerald-600 text-white p-3">
              Delivered / OK
              <span className="block text-[10px] opacity-80 font-mono mt-0.5">
                #16A34A
              </span>
            </div>
            <div className="rounded-xl bg-amber-500 text-slate-950 p-3">
              Rating / Kitchen
              <span className="block text-[10px] opacity-80 font-mono mt-0.5">
                #D97706
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Component Kit Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inputs & Buttons */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-5">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-600" />
            <span>Formularios Accesibles & Botones</span>
          </h3>

          <Input
            label="Buscador con ícono izquierdo"
            placeholder="Ej. Hamburguesa artesanal doble..."
            value={demoSearch}
            onChange={(e) => setDemoSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            helperText="Soporta estados de foco accesibles y modo oscuro nativo."
          />

          <Input
            label="Campo de Contraseña (con toggle Eye/EyeOff integrado)"
            type="password"
            value={demoPassword}
            onChange={(e) => setDemoPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
          />

          <Input
            label="Ejemplo con Validación de Error"
            defaultValue="correo-invalido"
            leftIcon={<Mail className="w-4 h-4" />}
            error="Por favor ingresa un correo electrónico válido."
          />

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <Button
              variant="primary"
              onClick={() =>
                toast.success('Producto agregado al carrito', {
                  description: 'Notificación renderizada con Sonner',
                })
              }
              leftIcon={<Bell className="w-4 h-4" />}
            >
              Disparar Toast Éxito
            </Button>
            <Button variant="secondary">Tracking Blue</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="danger" size="sm">
              Cancelar
            </Button>
          </div>
        </div>

        {/* Badges de Estados de Orden y Skeletons */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Badges Semánticos (Máquina de Estados)</span>
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSkeletons((prev) => !prev)}
            >
              {showSkeletons ? 'Ocultar Skeleton' : 'Ver Skeletons'}
            </Button>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Estados de Pedido (OrderStatusBadge)
            </p>
            <div className="flex flex-wrap gap-2">
              {allOrderStatuses.map((status) => (
                <OrderStatusBadge key={status} status={status} />
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Roles de Usuario (RBAC)
            </p>
            <div className="flex flex-wrap gap-2">
              <RoleBadge role="CLIENT" />
              <RoleBadge role="DELIVERY" />
              <RoleBadge role="ADMIN" />
            </div>
          </div>

          {showSkeletons && (
            <div className="pt-2">
              <ProductCardSkeleton />
            </div>
          )}
        </div>
      </div>

      {/* Demo Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Modal del Sistema de Diseño (Fase 0)"
        description="Soporta cierre con tecla Escape, clic en el backdrop glassmorphic y modo oscuro."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cerrar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsModalOpen(false);
                toast.success('¡Modal confirmado correctamente!');
              }}
            >
              Confirmar Acción
            </Button>
          </>
        }
      >
        <p className="leading-relaxed">
          Este componente <code>Modal.tsx</code> se reutilizará en la{' '}
          <strong>Fase 2</strong> (detalle de platos y reseñas),{' '}
          <strong>Fase 3</strong> (libreta de direcciones con mapa),{' '}
          <strong>Fase 4</strong> (confirmación de cancelación y calificación de
          productos) y <strong>Fase 7</strong> (CRUDs de administración).
        </p>
      </Modal>
    </div>
  );
}
