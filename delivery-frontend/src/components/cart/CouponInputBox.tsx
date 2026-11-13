import React, { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Tag, X } from 'lucide-react';
import { applyCouponApi } from '@/api/endpoints/coupons.api';
import { extractErrorMessage } from '@/api/axios.client';
import { useCartDrawerStore } from '@/store/useCartDrawerStore';
import { formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface CouponInputBoxProps {
  orderTotal: number;
}

export function CouponInputBox({ orderTotal }: CouponInputBoxProps) {
  const { appliedCoupon, setAppliedCoupon } = useCartDrawerStore();
  const [code, setCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Ingresa un código promocional.');
      return;
    }

    setIsApplying(true);
    try {
      const result = await applyCouponApi(code.trim(), orderTotal);
      setAppliedCoupon(result);
      setCode('');
      toast.success(`¡Cupón ${result.code} aplicado!`, {
        description: `Ahorraste ${formatCurrency(result.discountAmount)} en tu pedido.`,
      });
    } catch (error) {
      toast.error('Cupón no válido', {
        description: extractErrorMessage(error),
      });
    } finally {
      setIsApplying(false);
    }
  };

  if (appliedCoupon) {
    return (
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/80 dark:bg-emerald-950/40 p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-emerald-900 dark:text-emerald-200 block">
              Cupón {appliedCoupon.code} aplicado
            </span>
            <span className="text-emerald-700 dark:text-emerald-400">
              Descuento: -{formatCurrency(appliedCoupon.discountAmount)}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAppliedCoupon(null)}
          className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/50 cursor-pointer"
          title="Quitar cupón"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleApply} className="flex items-start gap-2">
      <div className="flex-1">
        <Input
          placeholder="Código de cupón (ej. BIENVENIDA20)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          leftIcon={<Tag className="w-4 h-4" />}
        />
      </div>
      <Button
        type="submit"
        variant="secondary"
        isLoading={isApplying}
        disabled={orderTotal <= 0}
      >
        Aplicar
      </Button>
    </form>
  );
}
