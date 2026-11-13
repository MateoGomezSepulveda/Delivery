import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '@/types/api.types';
import { Button } from '@/components/ui/Button';

interface PaginationBarProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function PaginationBar({ meta, onPageChange }: PaginationBarProps) {
  if (meta.lastPage <= 1) return null;

  const pages = Array.from({ length: meta.lastPage }, (_, i) => i + 1);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200/80 dark:border-slate-800">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        Mostrando página <strong>{meta.page}</strong> de{' '}
        <strong>{meta.lastPage}</strong> ({meta.total} productos en total)
      </p>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Anterior
        </Button>

        {pages.map((p) => (
          <Button
            key={p}
            variant={p === meta.page ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onPageChange(p)}
            className="w-9 px-0"
          >
            {p}
          </Button>
        ))}

        <Button
          variant="outline"
          size="sm"
          disabled={meta.page >= meta.lastPage}
          onClick={() => onPageChange(meta.page + 1)}
          rightIcon={<ChevronRight className="w-4 h-4" />}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
