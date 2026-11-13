import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MessageSquarePlus, Sparkles, Star } from 'lucide-react';
import { createReviewApi } from '@/api/endpoints/reviews.api';
import { extractErrorMessage } from '@/api/axios.client';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

interface ReviewFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  productId: string;
  productName: string;
  onReviewCreated?: (productId: string) => void;
}

const RATING_LABELS: Record<number, string> = {
  1: '1 Estrella — Necesita mejorar mucho',
  2: '2 Estrellas — Regular',
  3: '3 Estrellas — Bueno, cumplió',
  4: '4 Estrellas — Muy rico y recomendado',
  5: '5 Estrellas — ¡Excelente experiencia gastronómica!',
};

export function ReviewFormModal({
  isOpen,
  onClose,
  orderId,
  productId,
  productName,
  onReviewCreated,
}: ReviewFormModalProps) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState<number>(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>('');

  const activeRating = hoveredRating ?? rating;

  const createReviewMutation = useMutation({
    mutationFn: () =>
      createReviewApi({
        product: productId,
        order: orderId,
        rating,
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['product-reviews', productId],
      });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toast.success('¡Gracias por tu calificación!', {
        description: `Tu reseña de ${rating} estrellas para "${productName}" fue publicada en el catálogo.`,
      });
      onReviewCreated?.(productId);
      setComment('');
      setRating(5);
      onClose();
    },
    onError: (err) => {
      toast.error('No se pudo publicar la reseña', {
        description: extractErrorMessage(err),
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      toast.warning('Selecciona una calificación entre 1 y 5 estrellas.');
      return;
    }
    createReviewMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Calificar Producto Entregado"
      description={`Comparte tu opinión verificada sobre "${productName}".`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Star Selector Card */}
        <div className="rounded-2xl border border-orange-200/80 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20 p-5 text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-slate-900 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Compra Verificada · Orden #{orderId.slice(-6).toUpperCase()}
          </span>

          <div
            className="flex items-center justify-center gap-2 pt-1"
            onMouseLeave={() => setHoveredRating(null)}
          >
            {[1, 2, 3, 4, 5].map((star) => {
              const isFilled = star <= activeRating;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  aria-label={`Calificar con ${star} estrellas`}
                  className="p-1.5 rounded-xl transition-transform duration-150 hover:scale-110 focus:outline-none cursor-pointer"
                >
                  <Star
                    className={cn(
                      'w-8 h-8 transition-colors duration-150',
                      isFilled
                        ? 'text-amber-500 fill-amber-500 drop-shadow-sm'
                        : 'text-slate-300 dark:text-slate-700',
                    )}
                  />
                </button>
              );
            })}
          </div>

          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {RATING_LABELS[activeRating]}
          </p>
        </div>

        {/* Comment Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="review-comment"
              className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400"
            >
              Tu Comentario (Opcional)
            </label>
            <span className="text-[11px] text-slate-400">
              {comment.length}/500
            </span>
          </div>
          <textarea
            id="review-comment"
            rows={4}
            maxLength={500}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="¿Qué te pareció el sabor, la temperatura y la porción de este plato?"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={createReviewMutation.isPending}
            leftIcon={<MessageSquarePlus className="w-4 h-4" />}
          >
            Publicar Reseña
          </Button>
        </div>
      </form>
    </Modal>
  );
}
