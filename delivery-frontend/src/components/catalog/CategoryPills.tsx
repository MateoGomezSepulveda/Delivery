import {
  Beer,
  Flame,
  GlassWater,
  LayoutGrid,
  Sparkles,
  Tag,
  Wine,
} from 'lucide-react';
import type { Category } from '@/types/catalog.types';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/utils/cn';

interface CategoryPillsProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  isLoading?: boolean;
}

function getCategoryIcon(name: string) {
  const lower = name.toLowerCase();
  if (
    lower.includes('licor') ||
    lower.includes('whisky') ||
    lower.includes('ron') ||
    lower.includes('aguardiente') ||
    lower.includes('vino') ||
    lower.includes('destilado')
  ) {
    return <Wine className="w-4 h-4" />;
  }
  if (lower.includes('cerveza') || lower.includes('beer')) {
    return <Beer className="w-4 h-4" />;
  }
  if (
    lower.includes('cigarrillo') ||
    lower.includes('tabaco') ||
    lower.includes('vape') ||
    lower.includes('encendedor')
  ) {
    return <Flame className="w-4 h-4" />;
  }
  if (
    lower.includes('queso') ||
    lower.includes('charcuter') ||
    lower.includes('jamón') ||
    lower.includes('jamon') ||
    lower.includes('tabla')
  ) {
    return <Sparkles className="w-4 h-4" />;
  }
  if (
    lower.includes('bebida') ||
    lower.includes('hielo') ||
    lower.includes('mezclador') ||
    lower.includes('snack') ||
    lower.includes('pasaboca')
  ) {
    return <GlassWater className="w-4 h-4" />;
  }
  return <Tag className="w-4 h-4" />;
}

export function CategoryPills({
  categories,
  selectedCategoryId,
  onSelectCategory,
  isLoading = false,
}: CategoryPillsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-36 rounded-2xl shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar">
      <button
        type="button"
        onClick={() => onSelectCategory('')}
        className={cn(
          'inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all duration-200 shrink-0 cursor-pointer border',
          selectedCategoryId === ''
            ? 'bg-orange-600 text-white border-orange-600 shadow-warm dark:bg-orange-500 dark:border-orange-500'
            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-700',
        )}
      >
        <LayoutGrid className="w-4 h-4" />
        <span>Todo el Catálogo</span>
      </button>

      {categories.map((cat) => {
        const isActive = selectedCategoryId === cat._id;
        return (
          <button
            key={cat._id}
            type="button"
            onClick={() => onSelectCategory(isActive ? '' : cat._id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all duration-200 shrink-0 cursor-pointer border',
              isActive
                ? 'bg-orange-600 text-white border-orange-600 shadow-warm dark:bg-orange-500 dark:border-orange-500'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-700',
            )}
          >
            {getCategoryIcon(cat.name)}
            <span>{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}
