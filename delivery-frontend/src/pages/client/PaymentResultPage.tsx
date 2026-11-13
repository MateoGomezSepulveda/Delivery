import { useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Package,
  RefreshCw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { payOrderApi } from '@/api/endpoints/orders.api';
import { extractErrorMessage } from '@/api/axios.client';
import { Button } from '@/components/ui/Button';

export function PaymentResultPage() {
  const { status = 'success' } = useParams<{ status: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [retrying, setRetrying] = useState(false);

  const orderId =
    searchParams.get('external_reference') ||
    searchParams.get('orderId') ||
    '';
  const paymentId =
    searchParams.get('payment_id') ||
    searchParams.get('collection_id') ||
    '';

  const normalizedStatus =
    status === 'failure' || status === 'rejected'
      ? 'failure'
      : status === 'pending' || status === 'in_process'
        ? 'pending'
        : 'success';

  const handleRetryPayment = async () => {
    if (!orderId) {
      navigate('/orders');
      return;
    }
    try {
      setRetrying(true);
      const { paymentUrl } = await payOrderApi(orderId);
      if (paymentUrl) {
        window.location.href = paymentUrl;
      }
    } catch (err) {
      toast.error('No se pudo reiniciar MercadoPago', {
        description: extractErrorMessage(err),
      });
      navigate(`/orders/${orderId}`);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-12">
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-card text-center space-y-6">
        {normalizedStatus === 'success' && (
          <>
            <div className="mx-auto h-20 w-20 rounded-3xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <Sparkles className="w-3.5 h-3.5" />
                MercadoPago · Pago Aprobado
              </span>
              <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white">
                ¡Tu pago fue procesado con éxito!
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Hemos recibido la confirmación de tu pago. El restaurante ya puede preparar tu pedido.
              </p>
            </div>
          </>
        )}

        {normalizedStatus === 'pending' && (
          <>
            <div className="mx-auto h-20 w-20 rounded-3xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm">
              <Clock className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                <Clock className="w-3.5 h-3.5" />
                MercadoPago · En Validación
              </span>
              <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white">
                Tu pago está siendo procesado
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tan pronto la entidad financiera confirme la transacción vía Webhook, actualizaremos el estado de tu orden.
              </p>
            </div>
          </>
        )}

        {normalizedStatus === 'failure' && (
          <>
            <div className="mx-auto h-20 w-20 rounded-3xl bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 flex items-center justify-center shadow-sm">
              <XCircle className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-950/60 px-3 py-1 text-xs font-bold text-red-700 dark:text-red-300">
                <CreditCard className="w-3.5 h-3.5" />
                MercadoPago · Pago No Completado
              </span>
              <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white">
                No pudimos procesar el pago
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tu pedido sigue guardado en tu cuenta para que puedas reintentar el pago sin volver a armar el carrito.
              </p>
            </div>
          </>
        )}

        {(orderId || paymentId) && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 text-left space-y-1.5 text-xs">
            {orderId && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">ID de Orden:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  #{orderId.slice(-8).toUpperCase()}
                </span>
              </div>
            )}
            {paymentId && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Referencia MercadoPago:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {paymentId}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {normalizedStatus === 'failure' && orderId && (
            <Button
              variant="primary"
              isLoading={retrying}
              onClick={handleRetryPayment}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Reintentar Pago
            </Button>
          )}

          {orderId ? (
            <Link to={`/orders/${orderId}`} className="w-full sm:w-auto">
              <Button
                variant={normalizedStatus === 'failure' ? 'outline' : 'primary'}
                className="w-full"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Ver Seguimiento del Pedido
              </Button>
            </Link>
          ) : (
            <Link to="/orders" className="w-full sm:w-auto">
              <Button
                variant="primary"
                className="w-full"
                leftIcon={<Package className="w-4 h-4" />}
              >
                Ir a Mis Pedidos
              </Button>
            </Link>
          )}

          <Link to="/" className="w-full sm:w-auto">
            <Button variant="ghost" className="w-full">
              Volver al Catálogo
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
