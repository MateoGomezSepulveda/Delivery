import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRight,
  MapPin,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  addToCartApi,
  clearCartApi,
  getCartApi,
  removeFromCartApi,
} from '@/api/endpoints/cart.api';
import { extractErrorMessage } from '@/api/axios.client';
import type { Product } from '@/types/catalog.types';
import { useCartDrawerStore } from '@/store/useCartDrawerStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency } from '@/utils/formatters';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { CouponInputBox } from '@/components/cart/CouponInputBox';

export function CartDrawer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const {
    isOpen,
    closeDrawer,
    openAddressModal,
    activeAddressLabel,
    appliedCoupon,
    setAppliedCoupon,
  } = useCartDrawerStore();

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: getCartApi,
    enabled: isAuthenticated,
  });

  const addMutation = useMutation({
    mutationFn: ({
      productId,
      quantity,
    }: {
      productId: string;
      quantity: number;
    }) => addToCartApi(productId, quantity),
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(['cart'], updatedCart);
    },
    onError: (err) => {
      toast.error('No se pudo actualizar el carrito', {
        description: extractErrorMessage(err),
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => removeFromCartApi(productId),
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(['cart'], updatedCart);
      if (!updatedCart.items?.length) {
        setAppliedCoupon(null);
      }
      toast.success('Producto eliminado del carrito');
    },
    onError: (err) => {
      toast.error('Error al remover producto', {
        description: extractErrorMessage(err),
      });
    },
  });

  const clearMutation = useMutation({
    mutationFn: clearCartApi,
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(['cart'], updatedCart);
      setAppliedCoupon(null);
      toast.success('Carrito vaciado correctamente');
    },
  });

  const items = cart?.items ?? [];
  const subtotal = cart?.total ?? 0;
  const discount = appliedCoupon
    ? Math.min(appliedCoupon.discountAmount, subtotal)
    : 0;
  const finalTotal = Math.max(0, subtotal - discount);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={closeDrawer}
      title="Tu Carrito de Compras"
      subtitle={`Entrega en: ${activeAddressLabel}`}
      footer={
        isAuthenticated && items.length > 0 ? (
          <div className="space-y-4">
            <CouponInputBox orderTotal={subtotal} />

            <div className="space-y-1.5 text-sm border-t border-slate-200 dark:border-slate-800 pt-3">
              <div className="flex items-center justify-between text-slate-500">
                <span>Subtotal ({items.length} productos)</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between text-emerald-600 font-semibold">
                  <span>Descuento ({appliedCoupon?.code})</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-base font-extrabold text-slate-900 dark:text-white pt-1">
                <span>Total a Pagar</span>
                <span className="font-heading text-xl text-orange-600 dark:text-orange-400">
                  {formatCurrency(finalTotal)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="outline"
                size="sm"
                isLoading={clearMutation.isPending}
                onClick={() => clearMutation.mutate()}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Vaciar Carrito
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  closeDrawer();
                  toast.info('Listo para Checkout (Fase 4)', {
                    description:
                      'En la Fase 4 conectaremos POST /orders y la pasarela MercadoPago.',
                  });
                }}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Ir a Pagar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              closeDrawer();
              navigate('/');
            }}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            Explorar Catálogo
          </Button>
        )
      }
    >
      {!isAuthenticated ? (
        <EmptyState
          icon={<ShoppingBag className="w-7 h-7" />}
          title="Inicia sesión para armar tu pedido"
          description="Tu carrito se sincroniza en tiempo real con MongoDB (GET/POST /api/v1/cart)."
          action={
            <Link to="/login" onClick={closeDrawer}>
              <Button variant="primary">Iniciar Sesión Ahora</Button>
            </Link>
          }
        />
      ) : isLoading ? (
        <p className="text-center text-xs text-slate-400 py-10">
          Sincronizando tu carrito activo...
        </p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-7 h-7" />}
          title="Tu carrito está vacío"
          description="Agrega tus platos favoritos del catálogo para verlos aquí."
        />
      ) : (
        <div className="space-y-4">
          {/* Quick Address Selector Banner inside Cart */}
          <button
            type="button"
            onClick={openAddressModal}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-3 flex items-center justify-between gap-2 text-left hover:border-orange-400 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
              <div className="truncate">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Dirección de envío
                </span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {activeAddressLabel}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-orange-600 shrink-0">
              Cambiar
            </span>
          </button>

          {/* Cart Items List */}
          <div className="space-y-3">
            {items.map((item, idx) => {
              const prod =
                typeof item.productId === 'object' && item.productId !== null
                  ? (item.productId as Product)
                  : null;
              const prodId = prod ? prod._id : String(item.productId);
              const prodName = prod ? prod.name : `Producto #${idx + 1}`;
              const prodImage = prod?.image;

              return (
                <div
                  key={prodId}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {prodImage && (
                      <img
                        src={prodImage}
                        alt={prodName}
                        className="h-14 w-14 rounded-xl object-cover shrink-0 bg-slate-100"
                      />
                    )}
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {prodName}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {formatCurrency(item.price)} × {item.quantity}
                      </p>
                      <p className="text-xs font-extrabold text-orange-600 dark:text-orange-400 mt-0.5">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        addMutation.mutate({ productId: prodId, quantity: 1 })
                      }
                      disabled={addMutation.isPending}
                      title="Sumar 1 unidad"
                      className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-orange-50 hover:text-orange-600 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMutation.mutate(prodId)}
                      disabled={removeMutation.isPending}
                      title="Eliminar producto del carrito"
                      className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Drawer>
  );
}
