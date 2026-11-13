import {
  ArrowDownUp,
  Check,
  DollarSign,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import type { ProductSortBy, SortOrder } from '@/types/catalog.types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

interface ProductFiltersBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  minPrice: string;
  onMinPriceChange: (val: string) => void;
  maxPrice: string;
  onMaxPriceChange: (val: string) => void;
  onlyAvailable: boolean;
  onOnlyAvailableChange: (val: boolean) => void;
  sortBy: ProductSortBy;
  sortOrder: SortOrder;
  onSortChange: (sortBy: ProductSortBy, sortOrder: SortOrder) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export function ProductFiltersBar({
  search,
  onSearchChange,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
  onlyAvailable,
  onOnlyAvailableChange,
  sortBy,
  sortOrder,
  onSortChange,
  onResetFilters,
  hasActiveFilters,
}: ProductFiltersBarProps) {
  const sortValue = `${sortBy}:${sortOrder}`;

  const handleSelectSort = (val: string) => {
    const [nextSortBy, nextSortOrder] = val.split(':') as [
      ProductSortBy,
      SortOrder,
    ];
    onSortChange(nextSortBy, nextSortOrder);
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-card space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
        {/* Search Input */}
        <div className="md:col-span-5">
          <Input
            placeholder="Buscar plato o ingrediente (ej. trufa, salmón, pizza)..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Min & Max Price */}
        <div className="md:col-span-4 grid grid-cols-2 gap-2.5">
          <Input
            type="number"
            min={0}
            placeholder="Precio mín."
            value={minPrice}
            onChange={(e) => onMinPriceChange(e.target.value)}
            leftIcon={<DollarSign className="w-3.5 h-3.5" />}
          />
          <Input
            type="number"
            min={0}
            placeholder="Precio máx."
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(e.target.value)}
            leftIcon={<DollarSign className="w-3.5 h-3.5" />}
          />
        </div>

        {/* Dynamic Sort Selector */}
        <div className="md:col-span-3">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <ArrowDownUp className="w-4 h-4" />
            </div>
            <select
              value={sortValue}
              onChange={(e) => handleSelectSort(e.target.value)}
              aria-label="Ordenar productos por"
              className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-3.5 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 cursor-pointer"
            >
              <option value="createdAt:desc">Más recientes primero</option>
              <option value="price:asc">Precio: menor a mayor</option>
              <option value="price:desc">Precio: mayor a menor</option>
              <option value="name:asc">Nombre: A - Z</option>
              <option value="name:desc">Nombre: Z - A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bottom Filter Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <SlidersHorizontal className="w-3.5 h-3.5 text-orange-600" />
            <span>Filtros rápidos:</span>
          </span>

          <button
            type="button"
            onClick={() => onOnlyAvailableChange(!onlyAvailable)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
              onlyAvailable
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
            )}
          >
            <Check
              className={cn(
                'w-3.5 h-3.5 transition-opacity',
                onlyAvailable ? 'opacity-100' : 'opacity-40',
              )}
            />
            <span>Solo platos disponibles ahora</span>
          </button>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
