import { Eye, Plus, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import type { Category, Product } from '@/types/catalog.types';
import { formatCurrency } from '@/utils/formatters';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface ProductCardProps {
  product: Product;
  categoryName?: string;
  onSelectProduct: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

const FALLBACK_FOOD_IMAGE =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80';

export function ProductCard({
  product,
  categoryName,
  onSelectProduct,
  onAddToCart,
}: ProductCardProps) {
  const resolvedCategoryName =
    categoryName ||
    (typeof product.categoryId === 'object' && product.categoryId !== null
      ? (product.categoryId as Category).name
      : 'Especialidad');

  return (
    <article
      onClick={() => onSelectProduct(product)}
      className="group rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-card hover:border-orange-300 dark:hover:border-orange-700/80 transition-colors duration-200 flex flex-col cursor-pointer"
    >
      {/* Fixed aspect ratio image container (Zero CLS per ui-ux-pro-max) */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = FALLBACK_FOOD_IMAGE;
            }}
            className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-95"
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 gap-2">
            <UtensilsCrossed className="w-8 h-8 text-orange-500/70" />
            <span className="text-xs font-medium">Plato Artesanal</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className="rounded-full bg-slate-950/75 backdrop-blur-md text-white px-3 py-1 text-[11px] font-semibold">
            {resolvedCategoryName}
          </span>
          {product.available ? (
            <Badge variant="success">Disponible</Badge>
          ) : (
            <Badge variant="danger">Agotado</Badge>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-1.5">
          <h3 className="font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-1">
            {product.name}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
          <div>
            <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              Precio
            </span>
            <span className="font-heading text-lg font-extrabold text-slate-900 dark:text-white">
              {formatCurrency(product.price)}
            </span>
          </div>

          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="outline"
              size="icon"
              onClick={() => onSelectProduct(product)}
              title="Ver detalle e ingredientes y reseñas"
            >
              <Eye className="w-4 h-4" />
            </Button>

            <Button
              variant="primary"
              size="sm"
              disabled={!product.available}
              onClick={() =>
                onAddToCart ? onAddToCart(product) : onSelectProduct(product)
              }
              leftIcon={
                product.available ? (
                  <Plus className="w-4 h-4" />
                ) : (
                  <ShoppingBag className="w-4 h-4" />
                )
              }
            >
              {product.available ? 'Agregar' : 'Agotado'}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
