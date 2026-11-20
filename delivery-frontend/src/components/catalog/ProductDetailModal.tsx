import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  MessageSquareText,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Star,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import type { Product, ReviewUserPopulated } from '@/types/catalog.types';
import {
  deleteReviewApi,
  getProductReviewsApi,
} from '@/api/endpoints/reviews.api';
import { extractErrorMessage } from '@/api/axios.client';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { getProductStockState } from '@/utils/inventory';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

interface ProductDetailModalProps {
  product: Product | null;
  categoryName?: string;
  onClose: () => void;
  onAddToCart?: (product: Product, quantity: number) => void;
}

const FALLBACK_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=80';

export function ProductDetailModal({
  product,
  categoryName,
  onClose,
  onAddToCart,
}: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  useEffect(() => {
    setQuantity(1);
  }, [product?._id]);

  const { data: reviews = [], isLoading: isLoadingReviews } = useQuery({
    queryKey: ['product-reviews', product?._id],
    queryFn: () => getProductReviewsApi(product!._id),
    enabled: Boolean(product?._id),
  });

  const deleteReviewMutation = useMutation({
    mutationFn: (reviewId: string) => deleteReviewApi(reviewId),
    onSuccess: () => {
      toast.success('Reseña eliminada correctamente');
      if (product?._id) {
        queryClient.invalidateQueries({
          queryKey: ['product-reviews', product._id],
        });
      }
    },
    onError: (err) => {
      toast.error('No se pudo eliminar la reseña', {
        description: extractErrorMessage(err),
      });
    },
  });

  if (!product) return null;

  const stockState = getProductStockState(product);
  const maxQuantity =
    stockState.stock !== null && stockState.stock > 0
      ? stockState.stock
      : undefined;

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? (
          reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        ).toFixed(1)
      : 'Nuevo';

  return (
    <Modal
      isOpen={Boolean(product)}
      onClose={onClose}
      title={product.name}
      description={categoryName || 'Detalles del producto'}
      size="lg"
      footer={
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">
              Cantidad:
            </span>
            <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1">
              <button
                type="button"
                disabled={stockState.isOutOfStock || quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Disminuir cantidad"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-9 text-center font-heading font-bold text-sm">
                {quantity}
              </span>
              <button
                type="button"
                disabled={
                  stockState.isOutOfStock ||
                  (maxQuantity !== undefined && quantity >= maxQuantity)
                }
                onClick={() =>
                  setQuantity((q) =>
                    maxQuantity !== undefined ? Math.min(maxQuantity, q + 1) : q + 1,
                  )
                }
                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Aumentar cantidad"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {maxQuantity !== undefined && !stockState.isOutOfStock && (
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Máx. {maxQuantity}
              </span>
            )}
          </div>

          <Button
            variant="primary"
            size="lg"
            disabled={stockState.isOutOfStock}
            onClick={() => {
              if (onAddToCart) {
                onAddToCart(product, quantity);
              } else {
                toast.success(`${quantity}x ${product.name} listo para agregar`);
              }
              onClose();
            }}
            leftIcon={<ShoppingBag className="w-4 h-4" />}
          >
            {!stockState.isOutOfStock
              ? `Agregar al Carrito · ${formatCurrency(product.price * quantity)}`
              : 'Producto Agotado'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Product Hero Info */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-5 h-44 sm:h-48 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800">
            <img
              src={product.image || FALLBACK_PRODUCT_IMAGE}
              alt={product.name}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
              }}
              className={`h-full w-full object-cover ${
                stockState.isOutOfStock ? 'grayscale opacity-75' : ''
              }`}
            />
          </div>

          <div className="sm:col-span-7 flex flex-col justify-between space-y-2.5">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                {stockState.isOutOfStock ? (
                  <Badge variant="danger">Agotado</Badge>
                ) : stockState.isLowStock ? (
                  <Badge
                    variant="warning"
                    icon={<AlertTriangle className="w-3.5 h-3.5" />}
                  >
                    {stockState.lowStockLabel}
                  </Badge>
                ) : (
                  <Badge
                    variant="success"
                    icon={<Package className="w-3.5 h-3.5" />}
                  >
                    {stockState.stock !== null
                      ? `${stockState.stock} disponibles`
                      : 'Disponible ahora'}
                  </Badge>
                )}
                <Badge
                  variant="warning"
                  icon={<Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />}
                >
                  {averageRating} ({totalReviews}{' '}
                  {totalReviews === 1 ? 'reseña' : 'reseñas'})
                </Badge>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-1 whitespace-pre-line line-clamp-4">
                {product.description}
              </p>
            </div>

            <div className="rounded-xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200/70 dark:border-orange-900/50 p-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Precio unitario
              </span>
              <span className="font-heading text-xl font-extrabold text-orange-600 dark:text-orange-400">
                {formatCurrency(product.price)}
              </span>
            </div>
          </div>
        </div>

        {/* Public Reviews Section (GET /api/v1/reviews/product/:productId) */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
              <MessageSquareText className="w-3.5 h-3.5 text-orange-600" />
              <span>Reseñas Verificadas ({totalReviews})</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              Compras verificadas
            </span>
          </div>

          {isLoadingReviews ? (
            <Skeleton className="h-12 w-full rounded-xl" />
          ) : totalReviews === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-3 text-center text-xs text-slate-500 dark:text-slate-400">
              Aún no hay reseñas para este producto. ¡Sé el primero en calificarlo!
            </div>
          ) : (
            <div className="space-y-2">
              {reviews.slice(0, 2).map((rev) => {
                const authorName =
                  typeof rev.user === 'object' && rev.user !== null
                    ? (rev.user as ReviewUserPopulated).name
                    : 'Cliente Verificado';
                const authorId =
                  typeof rev.user === 'object' && rev.user !== null
                    ? (rev.user as ReviewUserPopulated)._id
                    : rev.user;
                const canDelete =
                  user && (user._id === authorId || user.role === 'ADMIN');

                return (
                  <div
                    key={rev._id}
                    className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 flex items-center justify-center text-xs font-bold">
                          <UserIcon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">
                            {authorName}
                          </span>
                          {rev.createdAt && (
                            <span className="text-[10px] text-slate-400">
                              {formatDateTime(rev.createdAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star
                              key={idx}
                              className={`w-3.5 h-3.5 ${
                                idx < rev.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300 dark:text-slate-600'
                              }`}
                            />
                          ))}
                        </div>

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => deleteReviewMutation.mutate(rev._id)}
                            title="Eliminar reseña"
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {rev.comment && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 pl-9">
                        {rev.comment}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
