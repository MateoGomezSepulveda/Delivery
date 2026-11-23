import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { getCartApi } from '@/api/endpoints/cart.api';
import { useCartMutations } from '@/hooks/useCartMutations';
import { useDeliveryFee } from '@/hooks/useDeliveryFee';
import { useRiderDiscountQuota } from '@/hooks/useRiderDiscountQuota';
import type { Product } from '@/types/catalog.types';
import { useCartDrawerStore } from '@/store/useCartDrawerStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency } from '@/utils/formatters';
import { getProductStockState } from '@/utils/inventory';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { CouponInputBox } from '@/components/cart/CouponInputBox';

export function CartDrawer() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const {
    isOpen,
    closeDrawer,
    openAddressModal,
    activeAddressLabel,
    appliedCoupon,
  } = useCartDrawerStore();

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: getCartApi,
    enabled: isAuthenticated,
  });

  const {
    addMutation,
    updateQuantityMutation,
    removeMutation,
    clearMutation,
  } = useCartMutations();
  const { data: riderQuota } = useRiderDiscountQuota();

  const items = isAuthenticated ? (cart?.items ?? []) : [];
  const subtotal = isAuthenticated ? (cart?.total ?? 0) : 0;
  const { deliveryFee } = useDeliveryFee({
    address: activeAddressLabel,
    subtotal,
    enabled: isAuthenticated && items.length > 0,
  });
  const isRider = isAuthenticated && user?.role === 'DELIVERY';
  const riderDiscount =
    isRider && riderQuota?.eligible ? Math.round(subtotal * 0.1) : 0;
  const discount = appliedCoupon
    ? Math.min(appliedCoupon.discountAmount, Math.max(0, subtotal - riderDiscount))
    : 0;
  const appliedDeliveryFee = items.length > 0 ? deliveryFee : 0;
  const finalTotal =
    Math.max(0, subtotal - riderDiscount - discount) + appliedDeliveryFee;

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
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Costo de domicilio</span>
                {appliedDeliveryFee > 0 ? (
                  <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                    {formatCurrency(appliedDeliveryFee)}
                  </span>
                ) : (
                  <span className="text-xs font-bold uppercase text-emerald-600">
                    Gratis
                  </span>
                )}
              </div>
              {riderDiscount > 0 && riderQuota && (
                <div className="flex items-center justify-between text-blue-600 font-semibold">
                  <span>
                    Beneficio Mensajero (-10% · {riderQuota.remaining}/
                    {riderQuota.monthlyLimit} disp.)
                  </span>
                  <span>-{formatCurrency(riderDiscount)}</span>
                </div>
              )}
              {isRider && riderQuota && !riderQuota.eligible && (
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Cupo mensual -10% agotado ({riderQuota.usedThisMonth}/
                    {riderQuota.monthlyLimit})
                  </span>
                  <span>$0</span>
                </div>
              )}
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
                  navigate('/checkout');
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
          description="Inicia sesión para guardar tus productos y recibir tu pedido a domicilio."
          action={
            <Link to="/login" onClick={closeDrawer}>
              <Button variant="primary">Iniciar Sesión Ahora</Button>
            </Link>
          }
        />
      ) : isLoading ? (
        <p className="text-center text-xs text-slate-400 py-10">
          Cargando tu carrito...
        </p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-7 h-7" />}
          title="Tu carrito está vacío"
          description="Agrega licores, cigarrillos, quesos o pasabocas desde el catálogo para verlos aquí."
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
              const stockState = prod ? getProductStockState(prod) : null;
              const reachedMaxStock =
                stockState?.stock !== null &&
                stockState?.stock !== undefined &&
                item.quantity >= stockState.stock;
              const isUpdatingCart =
                addMutation.isPending ||
                updateQuantityMutation.isPending ||
                removeMutation.isPending;

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
                      {stockState?.isLowStock && (
                        <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mt-0.5">
                          {stockState.lowStockLabel}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 p-0.5"
                      role="group"
                      aria-label={`Cantidad de ${prodName}`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantityMutation.mutate({
                            productId: prodId,
                            quantity: item.quantity - 1,
                          })
                        }
                        disabled={isUpdatingCart || item.quantity <= 1}
                        aria-label={`Quitar una unidad de ${prodName}`}
                        title={
                          item.quantity <= 1
                            ? 'Cantidad mínima: 1. Usa la papelera para eliminar el producto'
                            : 'Quitar 1 unidad'
                        }
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-orange-600 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 disabled:opacity-35 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <span
                        aria-live="polite"
                        className="min-w-[1.75rem] px-1 text-center text-xs font-extrabold tabular-nums text-slate-900 dark:text-white select-none"
                      >
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          addMutation.mutate({ productId: prodId, quantity: 1 })
                        }
                        disabled={isUpdatingCart || reachedMaxStock}
                        aria-label={`Sumar una unidad de ${prodName}`}
                        title={
                          reachedMaxStock
                            ? 'Stock máximo disponible alcanzado'
                            : 'Sumar 1 unidad'
                        }
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-orange-600 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 disabled:opacity-35 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeMutation.mutate(prodId)}
                      disabled={isUpdatingCart}
                      aria-label={`Eliminar ${prodName} del carrito`}
                      title="Eliminar producto del carrito"
                      className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/40 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:opacity-40 disabled:cursor-not-allowed"
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
